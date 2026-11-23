import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { fetchQuiz, fileToImage, getHealth, streamTutor } from './api';
import Markdown from './Markdown';
import Quiz from './Quiz';
import type { Difficulty, Health, ImageInput, Level, QuizPayload } from './types';

type Mode = 'tutor' | 'quiz';
type Status = 'idle' | 'loading' | 'streaming' | 'done';

const MAX_CHARS = 8000;

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [mode, setMode] = useState<Mode>('tutor');
  const [text, setText] = useState('');
  const [level, setLevel] = useState<Level>('college');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count, setCount] = useState(5);
  const [image, setImage] = useState<ImageInput | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setError('Cannot reach the Mentora server. Is it running?'));
  }, []);

  const busy = status === 'loading' || status === 'streaming';

  const clearOutput = () => {
    setError(null);
    setRefusal(null);
    setAnswer('');
    setQuiz(null);
    setStatus('idle');
  };

  const attach = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const img = await fileToImage(file); // validates type + size client-side
      setImage(img);
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setImage(null);
      setPreview(null);
      setError((e as Error).message);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    attach(e.dataTransfer.files?.[0]);
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
  };

  const run = async () => {
    clearOutput();
    if (!text.trim() && !image) {
      setError('Type a topic, paste notes, or upload a photo of your notes first.');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const payload = { text, level, difficulty, count, image: image ?? undefined };
    setStatus('loading');
    try {
      if (mode === 'tutor') {
        let buffer = '';
        await streamTutor(
          payload,
          (chunk) => {
            buffer += chunk;
            setStatus('streaming');
            const m = buffer.match(/^(OUT_OF_SCOPE|UNREADABLE):\s*(.*)/s);
            if (m) setRefusal(m[2].trim());
            else setAnswer(buffer);
          },
          controller.signal,
        );
      } else {
        const result = await fetchQuiz(payload, controller.signal);
        if (result.status !== 'ok') setRefusal(result.refusal_reason ?? 'Request could not be processed.');
        else setQuiz(result);
      }
      setStatus('done');
    } catch (e) {
      if ((e as Error).name === 'AbortError') setStatus('idle');
      else {
        setError((e as Error).message || 'Something went wrong.');
        setStatus('idle');
      }
    }
  };

  const stop = () => abortRef.current?.abort();

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>M</span>
          <div>
            <h1>Mentora</h1>
            <p>AI Tutor & Quiz Generator · SDG 4 Quality Education</p>
          </div>
        </div>
        {health && (
          <span className={`badge ${health.mode}`} title={health.model ?? 'No API key configured'}>
            {health.mode === 'live' ? `Gemini live · ${health.model}` : 'Demo mode (no API key)'}
          </span>
        )}
      </header>

      <main className="grid">
        {/* ---------------- Input panel ---------------- */}
        <section className="card input">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === 'tutor'} className={mode === 'tutor' ? 'on' : ''} onClick={() => { setMode('tutor'); clearOutput(); }}>
              Explain it to me
            </button>
            <button role="tab" aria-selected={mode === 'quiz'} className={mode === 'quiz' ? 'on' : ''} onClick={() => { setMode('quiz'); clearOutput(); }}>
              Quiz me
            </button>
          </div>

          <label htmlFor="notes">Topic or lecture notes</label>
          <textarea
            id="notes"
            value={text}
            maxLength={MAX_CHARS}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            placeholder="e.g. Explain Newton's second law, or paste your lecture notes here…"
            rows={7}
          />
          <div className="counter">{text.length}/{MAX_CHARS}</div>

          <div
            className={`drop ${dragging ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {preview ? (
              <div className="thumb">
                <img src={preview} alt="Uploaded notes preview" />
                <button className="btn ghost small" onClick={removeImage}>Remove</button>
              </div>
            ) : (
              <>
                <p>Drag & drop a photo of your notes or textbook page</p>
                <label className="btn ghost small filebtn">
                  Choose image
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => attach(e.target.files?.[0])} />
                </label>
                <small>JPEG / PNG / WebP · max 10 MB</small>
              </>
            )}
          </div>

          <div className="controls">
            <div>
              <label htmlFor="level">Your level</label>
              <select id="level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                <option value="high-school">High school</option>
                <option value="college">College</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            {mode === 'quiz' && (
              <>
                <div>
                  <label htmlFor="diff">Difficulty</label>
                  <select id="diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="count">Questions</label>
                  <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                    {[3, 5, 7, 10].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="row">
            <button className="btn primary" onClick={run} disabled={busy}>
              {busy ? 'Working…' : mode === 'tutor' ? 'Teach me' : 'Generate quiz'}
            </button>
            {busy && <button className="btn ghost" onClick={stop}>Stop</button>}
          </div>
        </section>

        {/* ---------------- Output panel ---------------- */}
        <div className="output">
          {error && <div className="alert error" role="alert">{error}</div>}
          {refusal && (
            <div className="alert info" role="status">
              <strong>Mentora can’t help with that.</strong> {refusal}
            </div>
          )}

          {status === 'loading' && (
            <div className="card loader" role="status" aria-live="polite">
              <span className="spinner" aria-hidden />
              <p>{mode === 'tutor' ? 'Mentora is preparing your lesson…' : 'Building your quiz from the material…'}</p>
            </div>
          )}

          {mode === 'tutor' && answer && (
            <section className="card lesson" aria-live="polite">
              <p className="eyebrow">Your lesson {status === 'streaming' && <span className="live">● streaming</span>}</p>
              <Markdown source={answer} />
            </section>
          )}

          {mode === 'quiz' && quiz && <Quiz key={`${quiz.topic ?? 'quiz'}-${quiz.questions.length}`} quiz={quiz} onReset={clearOutput} />}

          {status === 'idle' && !error && !refusal && !answer && !quiz && (
            <div className="card empty">
              <h2>Learn it. Then prove it.</h2>
              <p>
                Paste a topic or snap a photo of your notes. Mentora explains it step by step, then turns it into a
                practice quiz with worked solutions.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer>Mentora uses AI and can make mistakes — verify important facts with your instructor or textbook.</footer>
    </div>
  );
}
