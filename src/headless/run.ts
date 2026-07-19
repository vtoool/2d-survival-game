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
const ok = report.player.level >= 1 && report.player.inventory.length > 0
process.exitCode = ok ? 0 : 1
