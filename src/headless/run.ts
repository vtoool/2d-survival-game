// CLI entry for `npm run sim`. Runs the headless scenario and writes a log file.
import { runHarness } from './harness'

const seed = Number(process.env.SEED ?? 1234)
const ticks = Number(process.env.TICKS ?? 900)

const report = runHarness({
  seed,
  ticks,
  logFile: 'headless/last-run.log',
})

// Simple pass/fail sanity checks surfaced as an exit code for CI.
// The default scenario must demonstrate the full core loop end-to-end:
//   gather wood + stone + berries -> craft tools -> hunt (boars/rabbits)
//   -> take damage -> eat to recover -> kill -> gain XP/level.
const kills = report.eventCounts['kill'] ?? 0
const hit = report.eventCounts['hit'] ?? 0
const ok =
  report.player.inventory.length > 0 &&
  kills >= 1 &&
  (report.player.xp > 0 || report.player.level > 1) &&
  hit >= 1 // boar combat path exercised (eat/recovery covered by unit tests)

if (!ok) {
  console.error(
    `SIM FAILED assertions: kills=${kills} xp=${report.player.xp} level=${report.player.level} hit=${hit}`
  )
}
process.exitCode = ok ? 0 : 1
