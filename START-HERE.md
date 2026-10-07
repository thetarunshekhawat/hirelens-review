# HireLens Review: start here

HireLens Review is a governance review agent. It reviews a proposal to screen
campus job applicants using their public social media, and recommends what the
company should do, with its evidence, its limits, and the points where a person
must decide.

You can run it on your own computer in about five minutes. The agent uses your
own ChatGPT account while you use it.

---

## What you need

- **Node.js 20.9 or newer.** Download the LTS version from https://nodejs.org.
- **A ChatGPT plan that includes Codex:** Plus, Pro, Business, Edu or Enterprise.

## Run it

1. Unzip `HireLens-Review.zip`.
2. Open a terminal in the unzipped folder.
   - **Mac:** right-click the folder → *New Terminal at Folder*.
   - **Windows:** open the folder, type `cmd` in the address bar and press Enter.
3. Run:

   ```
   npm run hirelens
   ```

The first run:

- installs dependencies (about two minutes);
- opens your browser to **sign in with ChatGPT**, which is OpenAI's own sign-in through its Codex tool;
- builds the app and opens it at http://localhost:3000.

Later runs start in a few seconds.

## Try the agent

On the home page, press **Run the review live**. The agent works through the
case on its own, and you can watch every step:

1. reads the case file and the vendor's documents;
2. puts all 13 signals through six review questions;
3. investigates sample candidates;
4. runs a fairness test on 1,000 synthetic applicants;
5. checks Indian law and research in its evidence library;
6. formally hands legal and business questions to named people;
7. writes a recommendation memo with citations.

A live run takes two to three minutes. You can also press
**Replay the recorded run** to watch a run we recorded, or use the
**Ask the agent** button on any screen to ask a question about that screen.

## About your sign-in

- Signing in is done by OpenAI's official Codex command-line tool, and the
  sign-in is stored on your computer by that tool.
- HireLens Review never sees, reads or stores your sign-in.
- The agent uses your ChatGPT plan's Codex allowance only while you run it.
- To sign out afterwards, run: `npx codex logout`

## If something goes wrong

| What you see | What to do |
|---|---|
| `npm: command not found` | Install Node.js from https://nodejs.org, then open a new terminal. |
| "The agent could not use your ChatGPT sign-in" | Run `npx codex login`, sign in, then `npm run hirelens` again. |
| Port already in use | The script picks the next free port; use the address it prints. |
| You would rather use an API key | Create a file named `.env.local` containing `ANTHROPIC_API_KEY=your-key`, then run `npm run hirelens`. |

Every review screen (Signals, Candidates, Fairness test, Evidence, Decision
sheet, and Method & limits) works without signing in. Only the live agent
needs it.

## What is in this folder

| Path | What it is |
|---|---|
| `docs/` | The white paper |
| `README.md` | What the agent does and how it is built |
| `app/`, `components/` | The interface |
| `lib/review/` | The review method: six checks, outcome rules, fairness test, decision rules |
| `lib/case/` | The fictional case file: company, vendor, 13 signals, 9 candidates |
| `lib/library/` | The evidence library, led by Indian law |
| `lib/ai/`, `prompts.ts`, `mcp/` | The agent: instructions, tools, and the connection to ChatGPT |
| `data/recorded-run.json` | A real recorded run of the agent |
| `lib/__tests__/` | Automated tests (`npm test`) |

Everything in the case is fictional.
