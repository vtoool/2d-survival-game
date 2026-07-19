import { World, createLogger, TILE, type EntityKind, type ItemStack, type Vec2 } from '../core'
import { makeGatherBot } from './bots'
import * as fs from 'node:fs'
import * as path from 'node:path'

export interface HarnessOptions {
  width?: number
  height?: number
  seed?: number
  ticks?: number
  dt?: number
  trees?: number
  rocks?: number
  berryBushes?: number
  rabbits?: number
  boars?: number
  /** Optional path to write JSON-line event log. */
  logFile?: string
  /** Silent mode: skip console summary. */
  quiet?: boolean
}

export interface HarnessReport {
  ticks: number
  durationSec: number
  eventCount: number
  player: { pos: Vec2; level: number; xp: number; hp: number; inventory: ItemStack[] }
  remaining: Record<EntityKind, number>
  species: { rabbits: number; boars: number }
  eventCounts: Record<string, number>
}

function scatter(world: World, kind: 'tree' | 'rock' | 'berry' | 'rabbit' | 'boar', n: number): void {
  let placed = 0
  let attempts = 0
  while (placed < n && attempts < n * 60) {
    attempts++
    const tx = world.rng.int(2, world.width - 3)
    const ty = world.rng.int(2, world.height - 3)
    if (world.tileAt(tx, ty) === 1) continue
    const pos = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }
    if (kind === 'tree') world.spawnResource('tree', pos)
    else if (kind === 'rock') world.spawnResource('rock', pos)
    else if (kind === 'berry') world.spawnResource('berry', pos)
    else if (kind === 'rabbit') world.spawnAnimal(pos, 'rabbit')
    else world.spawnAnimal(pos, 'boar')
    placed++
  }
}

/** Build a world, run a scripted bot, and return a structured report + event log. */
export function runHarness(opts: HarnessOptions = {}): HarnessReport {
  const width = opts.width ?? 64
  const height = opts.height ?? 48
  const seed = opts.seed ?? 1234
  const ticks = opts.ticks ?? 900
  const dt = opts.dt ?? 1 / 30
  const logger = createLogger()
  const world = new World({ width, height, seed, logger })

  scatter(world, 'tree', opts.trees ?? 14)
  scatter(world, 'rock', opts.rocks ?? 8)
  scatter(world, 'berry', opts.berryBushes ?? 6)
  scatter(world, 'rabbit', opts.rabbits ?? 4)
  scatter(world, 'boar', opts.boars ?? 2)
  world.spawnPlayer({ x: (width * TILE) / 2, y: (height * TILE) / 2 }, 'hero')

  const bot = makeGatherBot('hero')
  for (let i = 0; i < ticks; i++) {
    world.step(dt, bot(world, i))
  }

  const events = logger.drain()
  if (opts.logFile) {
    fs.mkdirSync(path.dirname(opts.logFile), { recursive: true })
    fs.writeFileSync(opts.logFile, events.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8')
  }

  const player = world.entities.get('hero')!
  const remaining: Record<EntityKind, number> = {
    player: world.count('player'),
    tree: world.count('tree'),
    rock: world.count('rock'),
    berry: world.count('berry'),
    animal: world.count('animal'),
    item: world.count('item'),
  }
  let rabbits = 0
  let boars = 0
  for (const e of world.entities.values()) {
    if (e.kind !== 'animal') continue
    if (e.tier === 'boar') boars++
    else rabbits++
  }
  const eventCounts: Record<string, number> = {}
  for (const e of events) eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1

  const report: HarnessReport = {
    ticks,
    durationSec: +(ticks * dt).toFixed(2),
    eventCount: events.length,
    player: {
      pos: { x: +player.pos.x.toFixed(1), y: +player.pos.y.toFixed(1) },
      level: player.level ?? 1,
      xp: player.xp ?? 0,
      hp: player.hp,
      inventory: player.inventory ?? [],
    },
    remaining,
    species: { rabbits, boars },
    eventCounts,
  }

  if (!opts.quiet) {
    console.log('\n=== Joc headless harness report ===')
    console.log(JSON.stringify(report, null, 2))
  }
  return report
}
