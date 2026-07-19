import type { World } from '../core/world'
import type { Entity, EntityKind, Intent, ItemStack } from '../core/types'

// Host-authoritative networking codec (Phase 7).
// The host runs the canonical World and broadcasts a compact `snapshot` through
// PlayroomKit's shared room state. Each client sends its Intent via its own
// PlayerState and rebuilds a mirror World from the latest snapshot (interpolated
// by the renderer). Terrain is identical on every client because it is derived
// deterministically from the shared world seed.

export const KIND_CODE: Record<EntityKind, number> = {
  player: 0,
  tree: 1,
  rock: 2,
  berry: 5,
  animal: 3,
  item: 4,
}

export function kindFromCode(code: number): EntityKind {
  return (['player', 'tree', 'rock', 'animal', 'item', 'berry'] as EntityKind[])[code] ?? 'item'
}

/** Compact per-entity state emitted by the host each broadcast. */
export interface SnapEntity {
  i: string // id
  k: number // kind code
  x: number
  y: number
  r: number // radius
  h: number // hp
  m: number // maxHp
  t?: number // animal tier: 0 rabbit, 1 boar
  fx?: number // facing x
  fy?: number // facing y
  w?: { item: string; count: number } // worldItem
  inv?: ItemStack[] // player inventory
  lv?: number // player level
  xp?: number // player xp
}

/** Serialize the entire world into a snapshot array. */
export function serializeWorld(world: World): SnapEntity[] {
  const out: SnapEntity[] = []
  for (const e of world.entities.values()) {
    const s: SnapEntity = {
      i: e.id,
      k: KIND_CODE[e.kind],
      x: +e.pos.x.toFixed(1),
      y: +e.pos.y.toFixed(1),
      r: e.radius,
      h: +e.hp.toFixed(1),
      m: e.maxHp,
    }
    if (e.kind === 'animal') s.t = e.tier === 'boar' ? 1 : 0
    if (e.facing) {
      s.fx = +e.facing.x.toFixed(3)
      s.fy = +e.facing.y.toFixed(3)
    }
    if (e.worldItem) s.w = { item: e.worldItem.item, count: e.worldItem.count }
    if (e.kind === 'player') {
      s.inv = e.inventory ?? []
      s.lv = e.level ?? 1
      s.xp = e.xp ?? 0
    }
    out.push(s)
  }
  return out
}

/** Rebuild a mirror World's entities from a snapshot (terrain is left intact). */
export function applySnapshot(world: World, snap: SnapEntity[]): void {
  const seen = new Set<string>()
  for (const s of snap) {
    seen.add(s.i)
    let e = world.entities.get(s.i)
    if (!e) {
      e = {
        id: s.i,
        kind: kindFromCode(s.k),
        pos: { x: s.x, y: s.y },
        vel: { x: 0, y: 0 },
        radius: s.r,
        hp: s.h,
        maxHp: s.m,
        solid: s.k === 1 || s.k === 2, // tree / rock
      } as Entity
      world.entities.set(s.i, e)
    } else {
      e.pos.x = s.x
      e.pos.y = s.y
      e.radius = s.r
      e.hp = s.h
      e.maxHp = s.m
    }
    if (s.k === 3) e.tier = s.t === 1 ? 'boar' : 'rabbit' // animal
    if (s.fx !== undefined && s.fy !== undefined) e.facing = { x: s.fx, y: s.fy }
    if (s.w) e.worldItem = s.w
    if (s.k === 0) {
      e.inventory = s.inv ?? []
      e.level = s.lv ?? 1
      e.xp = s.xp ?? 0
    }
  }
  // Drop entities that disappeared (destroyed or player left).
  for (const id of [...world.entities.keys()]) {
    if (!seen.has(id)) world.entities.delete(id)
  }
}

const ACTION_CODE: Record<string, number> = { chop: 0, mine: 1, forage: 2, attack: 3, eat: 4, interact: 5, craft: 6 }

function actionFromCode(c: number): Intent['action'] {
  return (['chop', 'mine', 'forage', 'attack', 'eat', 'interact', 'craft'] as Intent['action'][])[c] ?? null
}

/** Encode an Intent to a compact, transport-friendly string. */
export function encodeIntent(intent: Intent): string {
  const a = intent.action ? ACTION_CODE[intent.action] ?? -1 : -1
  return JSON.stringify([
    +intent.move.x.toFixed(3),
    +intent.move.y.toFixed(3),
    a,
    intent.aim ? [+intent.aim.x.toFixed(1), +intent.aim.y.toFixed(1)] : null,
    intent.craftId,
  ])
}

/** Decode a string produced by encodeIntent back into an Intent. */
export function decodeIntent(raw: string | undefined): Intent | null {
  if (!raw) return null
  try {
    const [mx, my, a, aim, craftId] = JSON.parse(raw) as [number, number, number, [number, number] | null, string | null]
    return {
      move: { x: mx, y: my },
      action: a >= 0 ? actionFromCode(a) : null,
      aim: aim ? { x: aim[0], y: aim[1] } : null,
      craftId,
    }
  } catch {
    return null
  }
}
