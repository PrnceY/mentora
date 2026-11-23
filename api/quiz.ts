import type { VercelRequest, VercelResponse } from '@vercel/node';
import { demoQuiz } from '../server/demo.js';
import { generateQuiz, isLive } from '../server/gemini.js';
import { sendError } from '../server/http.js';
import { parseStudyRequest } from '../server/validate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const body = parseStudyRequest(req.body);
    res.json(isLive() ? await generateQuiz(body) : demoQuiz(body));
  } catch (err) {
    sendError(res, err);
  }
}