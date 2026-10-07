# HireLens Review: test log

What was tested, how, and what happened, including the failures found and
fixed along the way.

## 1. Automated tests

`npm test` runs 137 tests in 7 files. All pass.

| File | What it pins |
|---|---|
| `engine.test.ts` | The outcome of every one of the 13 signals; each rule R1–R7 in isolation; rule precedence; determinism |
| `candidates-fairness.test.ts` | Scoring arithmetic; the eight candidates pushed below the line and the one lifted above it; wrong-person, tagged-post, misread-language and absence findings; the fairness pool is identical on every run; the vendor configuration is flagged on tier, language, religion and presence; the reviewed configuration clears all flags; gender passes at group level despite S11 |
| `library-decision.test.ts` | Every library entry has a working id and https link; every signal's evidence exists; foreign law is never marked binding; six representative questions retrieve the right source first; the decision rules recommend "do not adopt"; gaps cover missing, conflicting and unclear items; the final decision is reserved for people; the agent's screen context ignores unknown or injected values |
| `backend.test.ts` | Which model the agent uses in each environment; a personal ChatGPT sign-in is never selected on a hosted deployment by default |
| `citations.test.ts`, `routing.test.ts`, `summary-signature.test.ts` | Citation numbering and verification, model routing, and tamper-proofing of conversation summaries |

## 2. Agent runs (end to end)

The agent was run with the ChatGPT sign-in mode (OpenAI Codex) on 8 October 2026.

| Test | Result |
|---|---|
| Full autonomous review, run 1 (API) | 24 tool calls in 137 s; all 7 plan phases; 5 hand-offs; memo in the required 7 sections; 6 sources cited |
| Full autonomous review, run 2 (recorded, `data/recorded-run.json`) | 24 tool calls in 127 s; all 7 phases; 5 hand-offs; 7 sources cited, 4 claim-verified |
| Full autonomous review, run 3 (in the browser) | 23 steps shown live; plan ticked off in order; memo and sources rendered |
| Screen-scoped question ("Why was this candidate flagged…" on Rahul Sharma's page) | Used the candidate tool and the library; identified the wrong-person match (0 of 3 details) and the DPDP accuracy duty; cited the source |

Every number in each memo was checked against the tools' outputs, including the
69% removed weight, the selection rates, the candidate scores and the
recommendation. None was invented. In all three runs the recommendation matched
the decision rules.

## 3. Interface

Every screen was loaded and screenshotted at 1440 px wide in a headless
browser with no console errors: Agent review, Signals, Signal detail,
Candidates, Candidate detail, Fairness test, Evidence, Decision sheet, and
Method & limits. The hosted mode (no model connected) was tested separately: it
shows the recorded run, labels it with its date, and explains how to run the
agent live.

## 4. Failures found and fixed

| # | What went wrong | Fix |
|---|---|---|
| 1 | The fairness pool at 240 applicants flagged groups even with no social signals, from random noise alone | Pool raised to 1,000, and the aptitude scores were balanced across groups by construction, so any gap now comes from the vendor's signals |
| 2 | The library search ranked an unrelated entry first for "Can we use photos a friend tagged?" because it matched the word "use" | Common verbs added to the stop list; "photo", "friend" and "family" added as tags on the public-data entry |
| 3 | In ChatGPT mode, every tool call failed with "requires approval" | Our tool server is pre-approved in the Codex configuration; Codex's own shell, file and web access stay off |
| 4 | Citations placed after the full stop could not be verified against their source | The agent's instructions now put citations before the full stop; verification went from 0 of 6 to 4 of 7 |
| 5 | A "Finding" label stretched into a circle on candidate pages | The flex alignment was fixed |
| 6 | Dev mode could not load Google Fonts in this environment | Tested on the production build, which is what is deployed and shipped |

## 5. Known limits (not defects)

- Sources marked unverified are not wrong. It means the sentence before the
  citation is worded differently from the library summary, so the automatic
  check cannot confirm it.
- A live run takes two to three minutes in ChatGPT mode, mostly the model's own
  start-up for each step.
- The ChatGPT sign-in mode depends on OpenAI's Codex tool. If OpenAI changes
  it, the API-key mode still works.
- Groups under 15 people in the fairness test are shown but not judged.
