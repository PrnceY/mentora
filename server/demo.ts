import type { QuizPayload, StudyRequest } from './validate';

/**
 * Offline DEMO MODE: used only when GEMINI_API_KEY is not set, so the UI can be
 * developed and tested without network access. Canned content, NOT real AI output.
 */
const DEMO_TUTOR = `## Big Idea
(Demo mode - add GEMINI_API_KEY to .env for real AI answers.) A derivative measures how fast a quantity changes at a single moment.

## Step-by-Step Explanation
1. Start with a function, for example f(x) = x^2.
2. Compare f at two nearby points: (f(x+h) - f(x)) / h.
3. Let h shrink toward 0 - the result is the derivative.
4. For x^2 this gives 2x.

## Worked Example
If f(x) = x^2, then at x = 3 the slope is 2 * 3 = 6.

## Check Yourself
- What is the derivative of x^3?
- What does the derivative tell you at a maximum point?`;

export async function* demoTutor(req: StudyRequest): AsyncGenerator<string> {
  if (/\b(cake|recipe|bake|election|politic)/i.test(req.text)) {
    yield 'OUT_OF_SCOPE: Mentora only helps with study topics such as math, science and engineering.';
    return;
  }
  for (const word of DEMO_TUTOR.split(/(?<=\s)/)) {
    yield word;
    await new Promise((r) => setTimeout(r, 15));
  }
}

export function demoQuiz(req: StudyRequest): QuizPayload {
  if (/\b(cake|recipe|bake|election|politic)/i.test(req.text)) {
    return { status: 'out_of_scope', refusal_reason: 'Mentora only helps with study topics such as math, science and engineering.', questions: [] };
  }
  return {
    status: 'ok',
    topic: 'Derivatives (demo)',
    difficulty: req.difficulty,
    questions: [
      {
        question: 'What is the derivative of f(x) = x^2?',
        options: ['x', '2x', 'x^2', '2'],
        correct_index: 1,
        explanation: 'The power rule brings the exponent down and reduces it by one.',
        steps: ['Identify n = 2 in x^n.', 'Multiply by n: 2 * x.', 'Reduce the power by 1: x^1.', 'Result: 2x.'],
      },
      {
        question: 'A derivative at a point represents...',
        options: ['The area under the curve', 'The instantaneous rate of change', 'The average value', 'The y-intercept'],
        correct_index: 1,
        explanation: 'It is the slope of the tangent line at that point.',
        steps: ['Slope = change in y / change in x.', 'Shrink the interval to zero.', 'The limit is the instantaneous rate of change.'],
      },
      {
        question: 'If f(x) = 5, what is f\'(x)?',
        options: ['5', '1', '0', 'x'],
        correct_index: 2,
        explanation: 'A constant does not change, so its rate of change is zero.',
        steps: ['A constant has a flat graph.', 'A flat line has slope 0.'],
      },
    ].slice(0, Math.max(3, Math.min(req.count, 3))),
    study_tips: ['Practice the power rule daily.', 'Sketch the graph before differentiating.'],
  };
}
