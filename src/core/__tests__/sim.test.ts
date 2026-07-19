import { describe, it, expect } from 'vitest'
import { World, createLogger, TILE, type Intent, type IntentMap } from '../index'

function idle(): Intent {
  return { move: { x: 0, y: 0 }, action: null, aim: null, craftId: null }
}

function intent(partial: Partial<Intent>): Intent {
  return { ...idle(), ...partial }
}

describe('core simulation', () => {
  it('keeps the player inside world bounds', () => {
    const w = new World({ width: 20, height: 20, seed: 1 })
    const p = w.spawnPlayer({ x: 10 * TILE, y: 10 * TILE })
    const drive: Intent = { ...idle(), move: { x: 1, y: 0 } }
    for (let i = 0; i < 600; i++) w.step(1 / 30, new Map([[p.id, drive]]))
    expect(p.pos.x).toBeLessThanOrEqual(w.width * TILE - p.radius + 0.001)
    expect(p.pos.x).toBeGreaterThan(10 * TILE)
  })

  it('chopping a tree drops and picks up wood', () => {
    const logger = createLogger()
    const w = new World({ width: 20, height: 20, seed: 2, logger })
    const tree = w.spawnResource('tree', { x: 100, y: 100 })
    const p = w.spawnPlayer({ x: 100, y: 118 })
    const chop: Intent = intent({ action: 'chop', aim: { x: 100, y: 100 } })
    for (let i = 0; i < 200; i++) w.step(1 / 30, new Map([[p.id, chop]]))
    const events = logger.drain()
    expect(w.entities.has(tree.id)).toBe(false)
    expect(events.some((e) => e.type === 'destroy')).toBe(true)
    const wood = p.inventory?.find((s) => s.item === 'wood')
    expect(wood && wood.count > 0).toBe(true)
  })

  it('killing an animal grants xp and emits a kill event', () => {
    const logger = createLogger()
    const w = new World({ width: 20, height: 20, seed: 3, logger })
    const animal = w.spawnAnimal({ x: 100, y: 118 })
    const p = w.spawnPlayer({ x: 100, y: 150 })
    // The animal flees, so the player must chase it while attacking.
    const hunt = (): Intent => {
      const a = w.entities.get(animal.id)
      if (!a) return idle()
      return intent({
        action: 'attack',
        aim: { x: a.pos.x, y: a.pos.y },
        move: { x: a.pos.x - p.pos.x, y: a.pos.y - p.pos.y },
      })
    }
    for (let i = 0; i < 200; i++) w.step(1 / 30, new Map([[p.id, hunt()]]))
    const events = logger.drain()
    expect(w.entities.has(animal.id)).toBe(false)
    expect(events.some((e) => e.type === 'kill')).toBe(true)
    expect((p.xp ?? 0) > 0).toBe(true)
  })

  it('is deterministic for a fixed seed and scripted intents', () => {
    const run = (): { x: number; y: number } => {
      const w = new World({ width: 24, height: 24, seed: 42 })
      const p = w.spawnPlayer({ x: 12 * TILE, y: 12 * TILE })
      const seq: IntentMap[] = []
      for (let i = 0; i < 120; i++) {
        const dir = i % 40 < 20 ? { x: 1, y: 0 } : { x: 0, y: 1 }
        const m = new Map<string, Intent>()
        m.set(p.id, intent({ move: dir }))
        seq.push(m)
      }
      for (const step of seq) w.step(1 / 30, step)
      return { x: p.pos.x, y: p.pos.y }
    }
    const a = run()
    const b = run()
    expect(a).toEqual(b)
  })
})
