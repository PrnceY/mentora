import type { Health, QuizPayload, StudyPayload } from './types';

async function readError(res: Response): Promise<string> {
  try {
    const j = await res.json();
    return j.error ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

export async function getHealth(): Promise<Health> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Server unreachable.');
  return res.json();
}

/** Reads the streamed tutor response and calls onChunk with each piece of text. */
export async function streamTutor(payload: StudyPayload, onChunk: (t: string) => void, signal: AbortSignal) {
  const res = await fetch('/api/tutor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(await readError(res));
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

export async function fetchQuiz(payload: StudyPayload, signal: AbortSignal): Promise<QuizPayload> {
  const res = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Client-side validation: catch oversized/unsupported files BEFORE any API call. */
export function fileToImage(file: File): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return reject(new Error('Please upload a JPEG, PNG or WebP image.'));
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return reject(new Error('Image is larger than 10 MB. Please choose a smaller file.'));
    }
        downscale(file).then(resolve).catch(() => reject(new Error('Could not read the image.')));
  });
}

/** Shrinks to max 1600px JPEG so uploads stay under Vercel's 4.5 MB body limit. */
async function downscale(file: File, maxDim = 1600, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL('image/jpeg', quality);
  return { data: url.split(',')[1] ?? '', mimeType: 'image/jpeg' };
}
