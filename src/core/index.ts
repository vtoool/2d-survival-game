// Public API for the simulation core. Import from here in client, net, and headless code.

export * from './types'
export * from './config'
export * from './rng'
export * from './log'
export * from './movement'
export * from './interaction'
export * from './ai'
export * from './player'
export * from './crafting'
export * from './world'

import type { IntentMap } from './types'
import type { World } from './world'

export interface SimController {
  /** Produce the intents for the next tick given the current world state. */
  (world: World, tick: number): IntentMap
}

/**
 * Run the world for `ticks` fixed steps of `dt` seconds, calling `control` once
 * per tick to gather intents. Returns the world for inspection.
 */
export function runSimulation(world: World, dt: number, ticks: number, control: SimController): World {
  for (let i = 0; i < ticks; i++) {
    const intents = control(world, i)
    world.step(dt, intents)
  }
  return world
}
