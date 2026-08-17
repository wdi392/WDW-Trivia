# Are You Smarter Than a 5th Grader? — Live Trivia

## ⚠️ First step after extracting

Your work computer's security settings block `.js` files that arrive as downloads, so these
three files were renamed with a `.txt` suffix so the zip would extract cleanly. **Rename them
back before running anything:**

- `server.js.txt` → `server.js`
- `questions.js.txt` → `questions.js`
- `test/simulate.js.txt` → `test/simulate.js`

(Right-click each file → Rename → delete the `.txt` at the end.)

A live, host-run trivia game for a room of individual players (tested with 30+).
One person (you) runs the **Host Console** on a laptop/projector; everyone else
joins on their own phone or laptop browser and answers individually.

## Game structure

| Round | Grade level | Questions | Points | Timer |
|---|---|---|---|---|
| Round 1 — Elementary Essentials | 1st–3rd | 10 | 10 pts each | 30s |
| Round 2 — Upper Elementary | 4th–5th | 10 | 20 pts each | 30s |
| Bonus — The Stumper | Genuinely hard adult trivia | 3 | Wagered | 20s to wager, then 30s to answer |

- **Scoring**: correct = full points, wrong = 0 (bonus round is wager-based: correct = +wager, wrong = -wager).
- **Cheats**: every player gets exactly **one Peek** (see a random already-submitted answer before you lock in yours) and **one Copy** (auto-copy a random already-submitted answer as your own) for the *entire* game — usable on any question, main round or bonus. Once used, they're gone.
- The host controls pacing: start a round, skip to the next question, force an early reveal, or skip a wager wait.

> Note: Peek and Copy target a **random** player who has already answered (not a player you pick by name). That keeps it simple and fast for 30+ people — ask if you'd rather let players choose a specific target.

## Running it

1. Install Node.js (v18+) if you don't have it.
2. In this folder, install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open the **Host Console** yourself: `http://localhost:3000/host.html`
5. Everyone else joins by opening the **player link** on their own device: `http://localhost:3000/`
   (the host console also displays this link).

### Getting the join link to everyone

**Same WiFi network (simplest):** Find your laptop's local IP address (e.g. `192.168.1.42`)
and share `http://192.168.1.42:3000/` instead of `localhost`. Everyone on the same WiFi can
reach it directly — no internet required.

**Mixed WiFi / cellular (some people on WiFi, some not):** A local IP only works for devices
on the same network, so anyone on cellular data or a different network won't be able to reach it.
To make the link reachable from anywhere, you need a public URL pointing at your laptop. Two options:

- Ask your IT/network team whether a quick tunneling tool (e.g. `localtunnel`, `ngrok`) is allowed
  on the corporate network — some corporate firewalls or proxies block these. If allowed, install
  and run one (e.g. `npx localtunnel --port 3000`) and share the public URL it prints instead of
  the local one.
- Alternatively, deploy this app to a small hosting service (Render, Railway, Fly.io, etc. all have
  free tiers) so it has a permanent public URL — better if you'll reuse this for future trivia nights.

Given this is on a Disney network, check with IT before installing any tunneling tool, since
some may not be approved for use on corporate WiFi.

## Files

- `server.js` — game server (Express + Socket.io): state machine, timers, scoring, peek/copy, wagering.
- `questions.js` — the question bank and round configuration. Edit this to change questions,
  point values, or timers.
- `public/index.html` — the player-facing page.
- `public/host.html` — the host console.
- `test/simulate.js` — an automated smoke test that simulates 5 players playing the full game
  (both rounds + bonus + peek/copy) and checks the scoring math. Run with the server already
  running: `node test/simulate.js`.

## Customizing

- Change questions, point values, or per-question/wager timers in `questions.js`.
- Change the number of questions per round by adding/removing entries in each round's `questions` array.
- Everything resets when you restart the server (scores live in memory only — there's no database).
