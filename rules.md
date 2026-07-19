# Rules & Best Practices — Joc

> **STRICT COMMANDMENTS for AI Agents Working on This Codebase**

---

## 1. No Race Conditions 🚫
**NEVER** call `insertCoin()` inside a React component.
**ALWAYS** use the `src/main.tsx` async bootstrapper (Network Gate).

---

## 2. Universal Design 🌐
**NEVER** hardcode "Desktop"/"Mobile".
**ALWAYS** Host (streamer) / Join (guest).
UI labels: "Enter the Wild", "Host", "Guest", "Scan to join".

---

## 3. Mobile First CSS 📱
Mandatory on interactive elements: `touch-action: none`, `user-select: none`.
Globals already set in `src/index.css`.

---

## 4. State Discipline 🎯
| State | Store |
|-------|-------|
| UI | React `useState` |
| Multiplayer | PlayroomKit |
| **Game (authoritative)** | **`src/core` World** |

**Rule:** The `src/core` World is the single source of truth for game state.
Never mirror it into React/Playroom as authoritative.

---

## 5. Determinism 🎲
Inside `src/core`, use **only** the seeded RNG (`createRng`).
**NEVER** `Math.random()`, `Date.now()`, or wall-clock time for simulation.
This is what makes `npm run sim` reproducible and debuggable.

---

## 6. Headless-First 🤖
Validate game logic with `npm run sim` (and `npm test` for units) **before**
adding visuals. Bots in `src/headless/bots.ts` use the same `Intent` interface
as players, so logic is exercised end-to-end.

---

## 7. Visual Testing Required 📸
Mandatory for UI changes (Playwright, from `visual-testing` skill):
```bash
npx playwright test
```

---

## 8. Always Deploy to Production 🚀
```bash
npm run build     # must pass (tsc + vite)
vercel --prod
```
Local dev does not replicate PlayroomKit WebRTC; verify on the production URL.

---

## 9. Git Workflow 🌿
```bash
git checkout -b feature/<name>
git add . && git commit -m "feat: ..."
git push origin feature/<name>
vercel --prod
```

---

*Enforcement: These rules are non-negotiable. Break them, break the game.*
