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
//   gather wood + stone -> craft tools -> hunt -> kill -> gain XP/level.
const ok =
  report.player.inventory.length > 0 &&
  (report.eventCounts['kill'] ?? 0) >= 1 &&
  (report.player.xp > 0 || report.player.level > 1)

if (!ok) {
  console.error(
    `SIM FAILED assertions: kills=${report.eventCounts['kill'] ?? 0} xp=${report.player.xp} level=${report.player.level}`
  )
}
process.exitCode = ok ? 0 : 1
