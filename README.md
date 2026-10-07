# HireLens Review

**A governance review agent that decides nothing on its own, and shows its work.**

HireLens Review examines a proposal to screen job applicants using their public
social media. It checks whether that information is suitable, representative and
properly used for the hiring purpose. It then gives the two people who own the
decision a recommendation, with its evidence, its limits, and the points where a
person must take over.

| | |
|---|---|
| **Live site** | https://hirelens-review.vercel.app |
| **Team** | Tarun Shekhawat · Mansi Jain · Khushi Garg · Nilanjana · Shourya Bardia · Vinamra Pattapu |
| **Problem area** | Information appropriateness and consent |
| **Decision supported** | Whether a company should adopt a social-media screening tool for campus hiring, and on what conditions |

---

## The case

Kestrel Infotech, a fictional Indian IT services company, hires about 20,000
freshers a year. Last cycle, 18% of freshers who accepted an offer never joined.
Talent Acquisition wants to buy **Orbis SocialFit**, a fictional vendor tool that
reads applicants' public Instagram, X, Facebook, LinkedIn and YouTube activity
and returns a *Reliability* score, a *Culture-fit* score and a *Professionalism*
flag.

The Head of Talent Acquisition and the Data Protection Officer must decide
whether to adopt it. HireLens Review is the agent that reviews the proposal for
them.

Every organisation, candidate and post in the case is fictional.

## What the agent does

Press **Run the review** and the agent works through the case on its own,
calling its tools one step at a time. You can watch each step as it happens.

1. **Reviews the data.** It reads the case file, the vendor's documents, the
   thirteen signals the tool uses, and nine sample candidate files.
2. **Follows a method.** It puts every signal through six questions, and fixed
   rules turn the answers into an outcome.
3. **Exposes gaps.** It lists what is missing (for example, no validation
   study), conflicting (research that disagrees), unclear (untested law) and
   outside its authority.
4. **Supports human judgement.** It formally hands every legal question,
   business judgement and the final decision to a named person, and writes a
   recommendation memo with citations.

You can also ask the agent questions from any screen. It can also review a
signal the vendor never listed: describe the signal, the agent judges the
facts, and the rules decide the outcome. The agent's facts are marked for a
person to confirm.

### The six questions

| # | Question | Grounded in |
|---|---|---|
| 1 | Is it related to the job (or to joining)? | Puttaswamy proportionality; research on validity |
| 2 | Does it stand in for who someone is? | Code on Wages 2019 s.3; RPwD, Transgender Persons, HIV/AIDS Acts |
| 3 | Is it the right person? | DPDP Act s.8(3): accuracy of data used in decisions |
| 4 | Did the candidate publish it, and would they expect this use? | DPDP Act s.3(c)(ii): the public-data exemption |
| 5 | Does it work equally for everyone? | Selection-rate impact ratios (fairness test) |
| 6 | Is there a less intrusive way? | Necessity limb of the proportionality test |

Indian law governs. GDPR, the EU AI Act, US rules and New York City's Local
Law 144 are used only as reference standards.

### What it found

- 9 of the 13 signals fail and are removed. They carry 69% of the tool's scoring weight.
- 2 signals are restricted, 1 is held for a human legal decision, and 1 is kept as a verification step only.
- Under the vendor's configuration, college tier, language of posts, religion
  and social-media presence fall below the 0.80 impact-ratio line. After the
  review, no group does.
- Gender passes the group-level test even though one signal penalises women's
  engagement posts directly. A group-level test can miss direct discrimination.
- Recommendation: **do not adopt as proposed.** The memo also sets out what
  Kestrel *can* do instead, for example asking every candidate directly about
  their joining plans.

## How it is built: five layers

| Layer | In this project |
|---|---|
| Quality controls | 132 automated tests pin every rule, number and outcome. A test log, and a named human sign-off on the decision sheet. |
| Reliable execution | Scores, outcomes, selection rates and the recommendation come from fixed rules in `lib/review/`. The agent calls them and never invents them. |
| Enterprise context | The case file, the vendor's documents, and an approved evidence library (`lib/library/`) led by Indian law. |
| Domain method | Six questions, outcome rules R1–R7, decision rules D1–D3, and explicit hand-off points. |
| General model capability | A Claude model plans the review, reads the evidence, explains it and drafts the memo. |

### The agent's tools

| Tool | What it returns |
|---|---|
| `getCaseFile` | The proposal, the vendor's claims, and which documents are missing |
| `getSignalReview` | The six checks, the outcome and the rule for one signal or all thirteen |
| `getCandidateReview` | A sample candidate's scores, identity check and findings |
| `runFairnessTest` | Selection rates and impact ratios by group, for any configuration |
| `searchEvidenceLibrary` / `getEvidenceForSignal` | Approved sources with links |
| `assessNewSignal` | The rules applied to a signal the vendor did not list |
| `recordHandoff` | A formal hand-off of a matter to a named person |
| `getDecisionRules` | The recommendation the decision rules produce |

## Screens

| Screen | Purpose |
|---|---|
| Agent review | The proposal, the live autonomous run and its memo |
| Signals | 13 signals × 6 questions, with the rule behind each outcome |
| Candidates | Nine sample cases: wrong person, tagged posts, misread languages, absence penalties, and one candidate lifted unfairly |
| Fairness test | Selection rates across 1,000 synthetic applicants; switch signals on and off |
| Evidence | The approved library, Indian law first |
| Decision sheet | Recommendation, gaps, human decisions, candidate notice, sign-off |
| Method & limits | What the agent may and may not do, and what this review cannot show |

## Limits

- The case is fictional. The method is general; the numbers are illustrative.
- The fairness test uses a synthetic pool built on stated assumptions. It shows
  what the scoring rules do, not what happened to real applicants.
- Nothing here can show whether the vendor tool predicts joining. That needs
  outcome data the vendor has not supplied.
- Legal summaries support the review. They are not legal advice.
- The agent's explanations can be wrong. Its numbers come from the tools, and
  its claims cite sources that can be checked.

## Running locally

```bash
cp env.template .env.local   # add ANTHROPIC_API_KEY
npm install
npm run build && npm start   # http://localhost:3000
npm test                     # 132 tests
```

Every screen works without a key. Only the agent's live runs and answers need one.

## Licence

MIT. See [LICENSE](LICENSE).
