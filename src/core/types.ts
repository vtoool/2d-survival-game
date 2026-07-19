// Core simulation types. Pure data — no Phaser, no DOM. Safe to run in Node.

export interface Vec2 {
  x: number
  y: number
}

export type ActionType = 'chop' | 'mine' | 'attack' | 'interact' | 'craft'

/** A player's desired action for a single tick. Same shape for human, bot, and remote player. */
export interface Intent {
  /** Desired movement direction; need not be normalized. {0,0} = idle. */
  move: Vec2
  /** Primary action to perform this tick, if any. */
  action: ActionType | null
  /** World-space point the player is aiming at (facing / target). */
  aim: Vec2 | null
  /** Recipe id when action === 'craft'. */
  craftId: string | null
}

export type EntityKind = 'player' | 'tree' | 'rock' | 'animal' | 'item'

export interface LootEntry {
  item: string
  min: number
  max: number
}

export interface ItemStack {
  item: string
  count: number
}

/** A dropped world item (created when a resource/animal is destroyed). */
export interface WorldItem {
  item: string
  count: number
}

export interface Entity {
  id: string
  kind: EntityKind
  pos: Vec2
  vel: Vec2
  /** Collision radius in world units. */
  radius: number
  hp: number
  maxHp: number
  /** Blocks movement of other entities. */
  solid: boolean

  // Resource (tree/rock)
  lootTable?: LootEntry[]
  /** Which action damages this resource. */
  harvestAction?: ActionType

  // Animal
  ai?: 'wander' | 'flee'
  /** Current wander heading in radians. */
  heading?: number
  /** Seconds until the next AI decision. */
  aiTimer?: number

  // World item
  worldItem?: WorldItem

  // Player
  inventory?: ItemStack[]
  xp?: number
  level?: number
  /** Facing unit vector, used for animation + attack direction. */
  facing?: Vec2
  /** Seconds until this player can act again. */
  attackCooldown?: number
  /** Accumulated tool tier derived from inventory (affects harvest power). */
  power?: number
}

export type SimEventType =
  | 'spawn'
  | 'move'
  | 'harvest'
  | 'destroy'
  | 'drop'
  | 'pickup'
  | 'attack'
  | 'kill'
  | 'levelup'
  | 'craft'
  | 'craft_fail'
  | 'error'

export interface SimEvent {
  /** Simulation time in seconds when the event occurred. */
  t: number
  type: SimEventType
  data: Record<string, unknown>
}

/** One player's input for a tick, keyed by player entity id. */
export type IntentMap = Map<string, Intent>
