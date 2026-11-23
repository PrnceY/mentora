import type { VercelResponse } from '@vercel/node';
import { HttpError } from './validate.js';

export function sendError(res: VercelResponse, err: unknown) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
}