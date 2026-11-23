# Mentora: AI Tutor & Quiz Generator (SDG 4: Quality Education)

React + TypeScript front end, Express + TypeScript back end, Gemini via `@google/genai`.

## Run locally
```bash
npm install
cp .env.example .env      # then paste your key from https://aistudio.google.com/apikey
npm run dev               # client http://localhost:5173, API :8787
```
Without a `GEMINI_API_KEY` the server starts in **demo mode** (canned responses, clearly badged in the UI) so you can test the interface offline.

## Production
```bash
npm run build && npm start   # Express serves dist/ and the API on one port
```
Deploy to a Node host (Render, Railway, Fly.io) and set `GEMINI_API_KEY` as an environment variable. Vercel/Netlify would need the API converted to serverless functions.

## Structure
- `server/config.ts` system instructions, JSON schema, parameters, safety settings
- `server/gemini.ts` streaming and structured-output calls
- `server/validate.ts` request and response validation
- `src/` UI (tutor streaming, interactive quiz, image upload)
- `docs/` SDLC report and video script
