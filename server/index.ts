import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModel } from './config.js';
import { demoQuiz, demoTutor } from './demo.js';
import { generateQuiz, isLive, streamTutor } from './gemini.js';
import { HttpError, parseStudyRequest } from './validate.js';
import type { NextFunction, Request, Response } from 'express';

const app = express();
app.use(express.json({ limit: '16mb' })); // base64 inflates 10 MB images ~1.37x

app.get('/api/health', (_req, res) => {
  res.json({ mode: isLive() ? 'live' : 'demo', model: isLive() ? getModel() : null });
});

/** Streams plain-text chunks to the browser as Gemini produces them. */
app.post('/api/tutor', async (req, res, next) => {
  try {
    const body = parseStudyRequest(req.body); // validate BEFORE touching the API
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    const source = isLive() ? streamTutor(body) : demoTutor(body);
    for await (const chunk of source) res.write(chunk);
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write('\n\n[STREAM_ERROR] The response was interrupted. Please try again.');
      res.end();
    } else next(err);
  }
});

app.post('/api/quiz', async (req, res, next) => {
  try {
    const body = parseStudyRequest(req.body);
    res.json(isLive() ? await generateQuiz(body) : demoQuiz(body));
  } catch (err) {
    next(err);
  }
});

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Central error handler: consistent JSON errors, no stack traces leaked.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if ((err as { type?: string })?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Upload is too large (max 10 MB image).' });
  }
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`Mentora API on :${port} — ${isLive() ? `LIVE (${getModel()})` : 'DEMO MODE (no GEMINI_API_KEY)'}`);
});
