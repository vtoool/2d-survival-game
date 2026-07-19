# JOC — Agentic Workflow Protocol

> **2D top-down multiplayer survival game (cute, cozy, cross-platform)**
> Stack: React + Vite + Tailwind + Phaser 3 + PlayroomKit
> Lineage: evolved from `ghost-coop` (Ecto-Busters) — same multiplayer + conventions system, new 2D world.

---

## 🎯 Project Identity

**Name:** Joc
**Type:** Cross-platform (desktop / tablet / mobile) 2D top-down survival, multiplayer
**Core Stack:** React 18 + Vite 5 + Tailwind v4 + Phaser 3 + PlayroomKit
**Sim Core:** Pure-TypeScript deterministic simulation in `src/core` (no Phaser/DOM)

---

## 📊 Current Status

- **Phase 0: COMPLETE** ✅ — Repo, toolchain, docs, opencode subagents/skills, PlayroomKit lobby shell.
- **Phase 1: IN PROGRESS** 🔧 — Core simulation + headless harness (movement, collision, gathering, loot, mobs, leveling, crafting stubs).

---

## 🏗️ Architecture

```
React shell (lobby / HUD)  ──  PlayroomKit (host-authoritative)
   └─ Phaser 3 canvas (world render + input)
          ↑ reads state / sends intents
   src/core/   Pure-TS deterministic sim (NO Phaser/DOM)  ← THE HEART
   src/headless/  Node harness: scripted bots → ticks → logs
   src/net/    PlayroomKit adapter (snapshot/intent sync)
```

### The Three-Layer Rule
1. **`src/core`** — all game logic. Deterministic, fixed-timestep, seeded RNG. Runs in browser AND Node.
2. **`src/client`** — Phaser rendering + input only. Never holds authoritative state.
3. **`src/net`** — maps core state ↔ PlayroomKit state. Host steps the sim; clients interpolate.

### Network Gate Pattern (from ghost-coop)
- `insertCoin()` happens ONLY in `src/main.tsx` (bootstrapper), never inside a component.
- Poll for `myPlayer().id` before rendering React. UI assumes the network is ready.

### State Discipline
| State type | Store | Access |
|------------|-------|--------|
| UI state | React `useState` | local only |
| Multiplayer state | PlayroomKit | `useMultiplayerState` / `myPlayer().setState` |
| **Game state** | **`src/core` World** | authoritative, host-run |

**Rule:** The authoritative game state lives in `src/core`, never duplicated into React/Playroom as the source of truth.

---

## 🐚 Continuous Self-Improvement Protocol

When working on any task, look for ways to upgrade capabilities: create `.opencode/skills/*` for repeated patterns, refine `AGENTS.md`/`rules.md`, and keep the headless harness as the primary iteration loop.

### Subagent "loop" workflow (orchestrated by the primary build agent)
```
1. invoke `planner`      → plan + acceptance criteria
2. implement in core/client/net
3. invoke `sim-tester`   → run `npm run sim`, read logs, fix until green   ← PRIMARY LOOP
4. invoke `reviewer`     → fix bugs/perf/security/rules issues
5. (UI/net) `mp-tester` + Playwright
6. lint → commit → `vercel --prod`
```
Subagents do not self-loop; the primary agent drives the loop.

### Skill Inventory
- `headless-sim` — run scripted bot scenarios, read JSON-line logs
- `multiplayer-sync` — 2-context Playwright sync testing (from ghost-coop)
- `visual-testing` — screenshot + analysis (from ghost-coop)
- `style-guide-compliance` — cute-theme checks (from ghost-coop)

---

## 🔧 The Headless Harness (primary dev loop)

Run the deterministic sim with scripted bots, no browser:
```bash
npm run sim                 # runs default scenario, writes headless/last-run.log
SEED=99 TICKS=1200 npm run sim
```
Bots use the **same `Intent` interface as real players**, so logic is validated end-to-end.
Unit tests: `npm test` (vitest over `src/core`).

---

## 🚦 Non-Negotiables
1. **Commit & deploy** after each change; verify build (`npm run build`) before `vercel --prod`.
2. **Network Gate** — `insertCoin()` only in `main.tsx`.
3. **Universal Design** — Host/Join, never "Desktop"/"Mobile".
4. **Mobile First** — `touch-action: none` + `user-select: none` (already global).
5. **State Discipline** — no duplicating `src/core` state into React/Playroom as source of truth.
6. **Determinism** — sim logic uses only the seeded RNG; never `Math.random()`/`Date.now()` inside `src/core`.
7. **Headless-first** — validate game logic via `npm run sim` before wiring visuals.

---

## 📁 Key Files
| File | Purpose |
|------|---------|
| `src/core/world.ts` | Authoritative simulation |
| `src/core/interaction.ts` | Player action resolution (harvest/attack/craft) |
| `src/core/ai.ts` | Animal wander/flee AI |
| `src/core/crafting.ts` | Recipe system |
| `src/headless/harness.ts` | Scenario runner + report |
| `src/headless/bots.ts` | Scripted gatherer bot |
| `src/main.tsx` | Network Gate bootstrapper |
| `src/components/Lobby.tsx` | Universal lobby |
| `src/client/game.ts` | Phaser canvas (Phase 5 world) |
| `src/net/playroomAdapter.ts` | Snapshot/intent sync (Phase 7) |

*Last Updated: 2026-07-19 — Phase 0 complete, Phase 1 in progress.*
