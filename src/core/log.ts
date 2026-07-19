// Structured logging for the headless harness.
// Events are collected per-tick by the World and drained by the harness, which
// can print JSON lines and/or write them to disk for later analysis.

import type { SimEvent } from './types'

export interface SimLogger {
  log(event: SimEvent): void
  drain(): SimEvent[]
  flushTo(console: boolean, sink?: (line: string) => void): void
}

export function createLogger(): SimLogger {
  let buffer: SimEvent[] = []
  return {
    log: (e) => buffer.push(e),
    drain: () => {
      const out = buffer
      buffer = []
      return out
    },
    flushTo: (consoleOut, sink) => {
      for (const e of buffer) {
        const line = JSON.stringify(e)
        if (consoleOut) process.stdout.write(line + '\n')
        sink?.(line)
      }
      buffer = []
    },
  }
}
