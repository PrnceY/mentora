import { useState } from 'react';
import type { QuizPayload } from './types';

export default function Quiz({ quiz, onReset }: { quiz: QuizPayload; onReset: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = quiz.questions.length;
  const q = quiz.questions[index];

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.correct_index) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= total) return setFinished(true);
    setIndex(index + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / total) * 100);
    return (
      <section className="card result" aria-live="polite">
        <p className="eyebrow">Quiz complete</p>
        <h2 className="score">
          {score}/{total} <span>({pct}%)</span>
        </h2>
        <p className="muted">
          {pct >= 80 ? 'Excellent mastery — try a harder level.' : pct >= 50 ? 'Good progress — review the explanations you missed.' : 'Keep going — re-read the tutor explanation, then retake.'}
        </p>
        {quiz.study_tips && quiz.study_tips.length > 0 && (
          <>
            <h3>Study tips</h3>
            <ul>
              {quiz.study_tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </>
        )}
        <div className="row">
          <button className="btn" onClick={restart}>Retake quiz</button>
          <button className="btn ghost" onClick={onReset}>New topic</button>
        </div>
      </section>
    );
  }

  return (
    <section className="card" aria-live="polite">
      <div className="quiz-head">
        <p className="eyebrow">
          {quiz.topic} · {quiz.difficulty}
        </p>
        <span className="pill">Question {index + 1} of {total}</span>
      </div>
      <div className="progress" aria-hidden>
        <div style={{ width: `${((index + (picked !== null ? 1 : 0)) / total) * 100}%` }} />
      </div>
      <h2 className="question">{q.question}</h2>
      <div className="options" role="group" aria-label="Answer choices">
        {q.options.map((opt, i) => {
          const state =
            picked === null ? '' : i === q.correct_index ? 'correct' : i === picked ? 'wrong' : 'dim';
          return (
            <button key={i} className={`option ${state}`} onClick={() => choose(i)} disabled={picked !== null}>
              <b>{String.fromCharCode(65 + i)}</b>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className={`feedback ${picked === q.correct_index ? 'ok' : 'no'}`}>
          <strong>{picked === q.correct_index ? 'Correct!' : `Not quite — the answer is ${String.fromCharCode(65 + q.correct_index)}.`}</strong>
          <p>{q.explanation}</p>
          {q.steps.length > 0 && (
            <ol>
              {q.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          <button className="btn" onClick={next}>{index + 1 >= total ? 'See results' : 'Next question'}</button>
        </div>
      )}
    </section>
  );
}
