import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getModel } from '../server/config.js';
import { isLive } from '../server/gemini.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({ mode: isLive() ? 'live' : 'demo', model: isLive() ? getModel() : null });
}