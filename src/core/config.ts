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
}

export const ANIMAL = {
  radius: 11,
  maxHp: 30,
  speed: 70,
  wanderRetarget: 2.5,
  fleeSpeed: 110,
  fleeRadius: 90,
  xp: 12,
  loot: [{ item: 'meat', min: 1, max: 2 }],
}
