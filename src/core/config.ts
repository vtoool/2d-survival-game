// Tunable gameplay constants. Kept in one place so balancing is a single-file edit.

export const TILE = 32 // world units per tile

export const PLAYER = {
  radius: 10,
  speed: 120, // units / second
  maxHp: 100,
  /** Base harvest/attack power before tool bonuses. */
  basePower: 10,
  /** Seconds between actions. */
  actionCooldown: 0.4,
  /** Reach beyond the player radius when interacting. */
  reach: 14,
  pickupRadius: 24,
  /** HP restored per berry eaten. */
  berryHeal: 22,
}

export const XP = {
  /** XP needed for level n -> n+1. */
  perLevel: (level: number): number => 20 + level * 15,
  /** HP granted per level up. */
  hpPerLevel: 15,
}

export const RESOURCE = {
  tree: { hp: 40, radius: 14, harvestAction: 'chop' as const, loot: [{ item: 'wood', min: 2, max: 4 }] },
  rock: { hp: 70, radius: 16, harvestAction: 'mine' as const, loot: [{ item: 'stone', min: 2, max: 3 }] },
  berry: { hp: 12, radius: 12, harvestAction: 'forage' as const, loot: [{ item: 'berry', min: 1, max: 3 }] },
}

export type AnimalTier = 'rabbit' | 'boar'

export const ANIMAL: Record<AnimalTier, {
  radius: number
  maxHp: number
  speed: number
  /** Behaviour when a player is near: rabbits flee, boars charge. */
  behaviour: 'flee' | 'charge'
  /** Speed while alarmed: flee speed (rabbits) or charge speed (boars). */
  alarmSpeed: number
  aggroRadius: number
  xp: number
  contactDamage: number
  loot: { item: string; min: number; max: number }[]
}> = {
  rabbit: {
    radius: 9,
    maxHp: 12,
    speed: 95,
    behaviour: 'flee',
    alarmSpeed: 105,
    aggroRadius: 110,
    xp: 8,
    contactDamage: 0,
    loot: [{ item: 'meat', min: 1, max: 1 }],
  },
  boar: {
    radius: 14,
    maxHp: 55,
    speed: 55,
    behaviour: 'charge',
    alarmSpeed: 115,
    aggroRadius: 160,
    xp: 25,
    contactDamage: 7,
    loot: [{ item: 'meat', min: 2, max: 3 }],
  },
}
