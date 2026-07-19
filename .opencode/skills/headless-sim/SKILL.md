---
name: headless-sim
description: Run scripted bot scenarios against the Joc pure-TS simulation and read JSON-line logs
metadata:
  category: testing
  framework: node
  project: joc
---

## What This Skill Does

Runs the deterministic, browser-free simulation to validate game logic fast:

- Movement + tile/bounds collision
- Resource harvesting (chop trees, mine rocks) and loot drops
- Animal AI (wander/flee) + combat + XP/leveling
- Crafting recipes and tool-based power scaling
- Inventory math (pickup, consume, underflow)

Bots in `src/headless/bots.ts` use the **same `Intent` interface as players**, so the
exact simulation code paths are exercised.

## When to Use This Skill

- Iterating on any `src/core` system (movement, harvest, AI, crafting, loot).
- Before wiring visuals — validate logic headlessly first (rules.md: Headless-First).
- Debugging desyncs or stuck entities.

## How to Run

```bash
npm run sim                 # default scenario (seed 1234, 900 ticks @ 1/30s)
SEED=99 TICKS=1200 npm run sim
```

Outputs:
- A JSON report to stdout (player pos/level/xp/inventory, remaining entity counts, event tallies).
- JSON-line events to `headless/last-run.log` (one `SimEvent` per line).

## Reading the Logs

Each event is `{ t, type, data }`. Key types: `spawn`, `harvest`, `destroy`,
`drop`, `pickup`, `attack`, `kill`, `levelup`, `craft`, `craft_fail`, `error`.

```bash
# Count harvest events
grep -c '"type":"harvest"' headless/last-run.log

# Show all level-ups
grep '"type":"levelup"' headless/last-run.log
```

## Writing a New Scenario

Edit `src/headless/harness.ts` `runHarness(opts)` — add spawns or change counts.
Add a new bot in `src/headless/bots.ts` returning `IntentMap` per tick. The bot
receives the `World` and returns intents keyed by player id.

## Acceptance Pattern

A scenario passes when the harness report shows the intended outcome, e.g.:
`player.inventory` contains `wood`, `remaining.tree` decreased, `player.level` >= 1,
and there are zero `error` events. CI reads the process exit code (0 = ok).

## Related Skills

- `multiplayer-sync` — 2-context Playwright sync
- `visual-testing` — screenshot verification
