import type { VercelRequest, VercelResponse } from '@vercel/node';
import { demoTutor } from '../server/demo.js';
import { isLive, streamTutor } from '../server/gemini.js';
import { sendError } from '../server/http.js';
import { parseStudyRequest } from '../server/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = parseStudyRequest(req.body);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    const source = isLive() ? streamTutor(body) : demoTutor(body);
    for await (const chunk of source) res.write(chunk);
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write('\n\n[STREAM_ERROR] The response was interrupted. Please try again.');
      res.end();
    } else sendError(res, err);
  }
}