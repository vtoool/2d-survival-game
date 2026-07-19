import type { Entity, EntityKind, IntentMap, LootEntry, Vec2, WorldItem } from './types'
import { createRng, type Rng } from './rng'
import { createLogger, type SimLogger } from './log'
import { ANIMAL, type AnimalTier, PLAYER, RESOURCE, TILE } from './config'
import { applyIntent } from './interaction'
import { updateAnimal } from './ai'
import { addItem } from './player'

export interface WorldOptions {
  width: number // tiles
  height: number // tiles
  seed?: number
  logger?: SimLogger
}

/**
 * Authoritative, deterministic game world. Pure TypeScript — no Phaser/DOM.
 * `step(dt, intents)` advances one fixed tick; intents keyed by player entity id.
 */
export class World {
  readonly width: number
  readonly height: number
  readonly tiles: Uint8Array // 0 = ground, 1 = solid
  readonly entities = new Map<string, Entity>()
  readonly rng: Rng
  readonly logger: SimLogger
  time = 0
  private idCounter = 1

  constructor(opts: WorldOptions) {
    this.width = opts.width
    this.height = opts.height
    this.tiles = new Uint8Array(this.width * this.height)
    this.rng = createRng(opts.seed ?? 1)
    this.logger = opts.logger ?? createLogger()
    this.generateTerrain()
  }

  /** Procedural border + a few solid rock walls so collision is exercised. */
  private generateTerrain(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const edge = x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1
        this.tiles[y * this.width + x] = edge ? 1 : 0
      }
    }
    // A short internal wall segment to test pathing around obstacles.
    for (let y = 4; y < 10; y++) {
      this.tiles[y * this.width + 12] = 1
    }
  }

  tileAt(tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return 1
    return this.tiles[ty * this.width + tx]
  }

  private nextId(prefix: string): string {
    return `${prefix}_${this.idCounter++}`
  }

  spawnPlayer(pos: Vec2, id?: string): Entity {
    const e: Entity = {
      id: id ?? this.nextId('player'),
      kind: 'player',
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      radius: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      solid: false,
      inventory: [],
      xp: 0,
      level: 1,
      facing: { x: 0, y: 1 },
      attackCooldown: 0,
      power: PLAYER.basePower,
    }
    this.entities.set(e.id, e)
    this.logger.log({ t: this.time, type: 'spawn', data: { id: e.id, kind: 'player', pos } })
    return e
  }

  spawnResource(kind: 'tree' | 'rock' | 'berry', pos: Vec2, id?: string): Entity {
    const def = RESOURCE[kind]
    const e: Entity = {
      id: id ?? this.nextId(kind),
      kind,
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      radius: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      solid: true,
      lootTable: def.loot as LootEntry[],
      harvestAction: def.harvestAction,
    }
    this.entities.set(e.id, e)
    this.logger.log({ t: this.time, type: 'spawn', data: { id: e.id, kind, pos } })
    return e
  }

  spawnAnimal(pos: Vec2, tier: AnimalTier = 'rabbit', id?: string): Entity {
    const def = ANIMAL[tier]
    const e: Entity = {
      id: id ?? this.nextId('animal'),
      kind: 'animal',
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      radius: def.radius,
      hp: def.maxHp,
      maxHp: def.maxHp,
      solid: false,
      ai: 'wander',
      heading: this.rng.range(0, Math.PI * 2),
      aiTimer: 0,
      attackCooldown: 0,
      tier,
      lootTable: def.loot as LootEntry[],
      xp: def.xp,
      contactDamage: def.contactDamage,
    }
    this.entities.set(e.id, e)
    this.logger.log({ t: this.time, type: 'spawn', data: { id: e.id, kind: 'animal', tier, pos } })
    return e
  }

  spawnItem(pos: Vec2, item: string, count: number, id?: string): Entity {
    const wi: WorldItem = { item, count }
    const e: Entity = {
      id: id ?? this.nextId('item'),
      kind: 'item',
      pos: { ...pos },
      vel: { x: 0, y: 0 },
      radius: 8,
      hp: 1,
      maxHp: 1,
      solid: false,
      worldItem: wi,
    }
    this.entities.set(e.id, e)
    return e
  }

  remove(id: string): void {
    this.entities.delete(id)
  }

  /** Advance one fixed tick. */
  step(dt: number, intents: IntentMap): void {
    this.time += dt

    for (const e of this.entities.values()) {
      if (e.kind === 'player') {
        const intent = intents.get(e.id) ?? { move: { x: 0, y: 0 }, action: null, aim: null, craftId: null }
        applyIntent(this, e, intent, dt)
      } else if (e.kind === 'animal') {
        updateAnimal(this, e, dt)
      }
    }

    this.collectItems()
  }

  /** Players automatically pick up nearby world items into their inventory. */
  private collectItems(): void {
    for (const p of this.entities.values()) {
      if (p.kind !== 'player') continue
      for (const item of this.entities.values()) {
        if (item.kind !== 'item' || !item.worldItem) continue
        const d = Math.hypot(item.pos.x - p.pos.x, item.pos.y - p.pos.y)
        if (d <= p.radius + PLAYER.pickupRadius) {
          addItem(p, item.worldItem.item, item.worldItem.count)
          this.logger.log({
            t: this.time,
            type: 'pickup',
            data: { by: p.id, item: item.worldItem.item, count: item.worldItem.count },
          })
          this.remove(item.id)
        }
      }
    }
  }

  /** Count living entities of a kind (used by the harness for assertions). */
  count(kind: EntityKind): number {
    let n = 0
    for (const e of this.entities.values()) if (e.kind === kind) n++
    return n
  }
}

export const WORLD_TILE = TILE
