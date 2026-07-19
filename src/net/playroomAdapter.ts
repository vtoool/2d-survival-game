import type { World } from '../core/world'
import type { EntityKind } from '../core/types'

// Host-authoritative networking adapter (full implementation lands in Phase 7).
// The host runs the canonical World and broadcasts compact snapshots; clients
// send input intents and interpolate. PlayroomKit carries the state.

export interface EntitySnapshot {
  id: string
  k: number // kind code
  x: number
  y: number
  hp: number
}

const KIND_CODE: Record<EntityKind, number> = { player: 0, tree: 1, rock: 2, berry: 5, animal: 3, item: 4 }

/** Serialize the world into a compact, transport-friendly snapshot. */
export function snapshot(world: World): EntitySnapshot[] {
  const out: EntitySnapshot[] = []
  for (const e of world.entities.values()) {
    out.push({ id: e.id, k: KIND_CODE[e.kind], x: +e.pos.x.toFixed(1), y: +e.pos.y.toFixed(1), hp: e.hp })
  }
  return out
}

export function kindFromCode(code: number): EntityKind {
  return (['player', 'tree', 'rock', 'animal', 'item', 'berry'] as EntityKind[])[code] ?? 'item'
}
