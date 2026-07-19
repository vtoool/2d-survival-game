import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { World, TILE, type Entity, type Intent } from '../core'

const COLORS = {
  ground: 0x7cc36b,
  solid: 0x5a8f4a,
  wall: 0x6b4a2f,
  trunk: 0x8a5a2b,
  leaf: 0x3f9d4f,
  rock: 0x9aa0a6,
  bush: 0x4caf50,
  berry: 0xe85b6b,
  rabbit: 0xd8c39a,
  boar: 0x6b4a3a,
  item: 0xffe27a,
  player: 0x4ea3ff,
  facing: 0xfff7e6,
}

const ITEM_COLORS: Record<string, number> = {
  wood: 0xb5793b,
  stone: 0x9aa0a6,
  berry: 0xe85b6b,
  meat: 0xe06b6b,
  axe: 0xc9a24b,
  pick: 0xb0b6bd,
  sword: 0xd8d8e0,
}

/** Pick the action for the local player given what they're standing next to. */
function pickAction(world: World, player: Entity): Intent['action'] {
  const reach = player.radius + 14
  let best: Entity | null = null
  let bestD = Infinity
  for (const e of world.entities.values()) {
    if (e.kind !== 'tree' && e.kind !== 'rock' && e.kind !== 'berry' && e.kind !== 'animal') continue
    const d = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y)
    if (d <= reach + e.radius && d < bestD) {
      best = e
      bestD = d
    }
  }
  if (!best) return null
  if (best.kind === 'animal') return 'attack'
  if (best.kind === 'tree') return 'chop'
  if (best.kind === 'rock') return 'mine'
  if (best.kind === 'berry') return 'forage'
  return null
}

function scatter(world: World): void {
  for (let i = 0; i < 16; i++) world.spawnResource('tree', { x: world.rng.int(2, world.width - 3) * TILE + TILE / 2, y: world.rng.int(2, world.height - 3) * TILE + TILE / 2 })
  for (let i = 0; i < 10; i++) world.spawnResource('rock', { x: world.rng.int(2, world.width - 3) * TILE + TILE / 2, y: world.rng.int(2, world.height - 3) * TILE + TILE / 2 })
  for (let i = 0; i < 6; i++) world.spawnResource('berry', { x: world.rng.int(2, world.width - 3) * TILE + TILE / 2, y: world.rng.int(2, world.height - 3) * TILE + TILE / 2 })
  for (let i = 0; i < 4; i++) world.spawnAnimal({ x: world.rng.int(4, world.width - 5) * TILE + TILE / 2, y: world.rng.int(4, world.height - 5) * TILE + TILE / 2 }, 'rabbit')
  for (let i = 0; i < 2; i++) world.spawnAnimal({ x: world.rng.int(4, world.width - 5) * TILE + TILE / 2, y: world.rng.int(4, world.height - 5) * TILE + TILE / 2 }, 'boar')
}

class WorldScene extends Phaser.Scene {
  private world!: World
  private playerId = 'hero'
  private gfx!: Phaser.GameObjects.Graphics
  private hud!: Phaser.GameObjects.Text
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private acc = 0
  private readonly dt = 1 / 30

  constructor() {
    super('world')
  }

  create(): void {
    this.world = new World({ width: 64, height: 48, seed: 1234 })
    scatter(this.world)
    this.world.spawnPlayer({ x: (this.world.width * TILE) / 2, y: (this.world.height * TILE) / 2 }, this.playerId)

    this.cameras.main.setBackgroundColor(COLORS.ground)
    this.cameras.main.setZoom(1)
    this.gfx = this.add.graphics()
    this.hud = this.add
      .text(12, 12, '', { fontFamily: 'Nunito, sans-serif', fontSize: '16px', color: '#fff7e6' })
      .setScrollFactor(0)
      .setDepth(1000)

    const kb = this.input.keyboard!
    this.keys = kb.addKeys('W,A,S,D,SPACE,F') as Record<string, Phaser.Input.Keyboard.Key>
  }

  private buildIntent(): Intent {
    const player = this.world.entities.get(this.playerId)!
    const move = { x: 0, y: 0 }
    if (this.keys.A.isDown) move.x -= 1
    if (this.keys.D.isDown) move.x += 1
    if (this.keys.W.isDown) move.y -= 1
    if (this.keys.S.isDown) move.y += 1

    const pointer = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y)
    const aim = { x: pointer.x, y: pointer.y }

    let action: Intent['action'] = null
    if (this.keys.F.isDown) action = 'eat'
    else if (this.keys.SPACE.isDown || this.input.activePointer.isDown) action = pickAction(this.world, player)

    return { move, action, aim, craftId: null }
  }

  update(_t: number, deltaMs: number): void {
    this.acc += deltaMs / 1000
    let steps = 0
    while (this.acc >= this.dt && steps < 5) {
      this.world.step(this.dt, new Map([[this.playerId, this.buildIntent()]]))
      this.acc -= this.dt
      steps++
    }
    this.draw()
    const p = this.world.entities.get(this.playerId)
    if (p) this.cameras.main.centerOn(p.pos.x, p.pos.y)
  }

  private draw(): void {
    const g = this.gfx
    g.clear()

    // Solid tiles (borders + internal walls).
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        if (this.world.tileAt(x, y) === 1) {
          const wall = x === 0 || y === 0 || x === this.world.width - 1 || y === this.world.height - 1
          g.fillStyle(wall ? COLORS.wall : COLORS.solid, 1)
          g.fillRect(x * TILE, y * TILE, TILE, TILE)
        }
      }
    }

    for (const e of this.world.entities.values()) {
      const { x, y } = e.pos
      switch (e.kind) {
        case 'tree': {
          g.fillStyle(COLORS.trunk, 1)
          g.fillRect(x - 4, y, 8, e.radius)
          g.fillStyle(COLORS.leaf, 1)
          g.fillCircle(x, y - 4, e.radius)
          break
        }
        case 'rock':
          g.fillStyle(COLORS.rock, 1)
          g.fillCircle(x, y, e.radius)
          break
        case 'berry':
          g.fillStyle(COLORS.bush, 1)
          g.fillCircle(x, y, e.radius)
          g.fillStyle(COLORS.berry, 1)
          g.fillCircle(x - 5, y - 3, 3)
          g.fillCircle(x + 4, y + 2, 3)
          g.fillCircle(x + 1, y + 6, 3)
          break
        case 'animal': {
          const c = e.tier === 'boar' ? COLORS.boar : COLORS.rabbit
          g.fillStyle(c, 1)
          g.fillCircle(x, y, e.radius)
          break
        }
        case 'item': {
          const col = ITEM_COLORS[e.worldItem?.item ?? ''] ?? COLORS.item
          g.fillStyle(col, 1)
          g.fillRect(x - 6, y - 6, 12, 12)
          break
        }
        case 'player': {
          g.fillStyle(0x000000, 0.15)
          g.fillEllipse(x, y + e.radius - 2, e.radius * 1.6, e.radius * 0.7)
          g.fillStyle(COLORS.player, 1)
          g.fillCircle(x, y, e.radius)
          const f = e.facing ?? { x: 0, y: 1 }
          g.lineStyle(4, COLORS.facing, 1)
          g.beginPath()
          g.moveTo(x, y)
          g.lineTo(x + f.x * (e.radius + 8), y + f.y * (e.radius + 8))
          g.strokePath()
          // HP ring
          g.lineStyle(3, 0xff5555, 1)
          g.beginPath()
          g.arc(x, y, e.radius + 6, -Math.PI / 2, -Math.PI / 2 + (e.hp / e.maxHp) * Math.PI * 2)
          g.strokePath()
          break
        }
      }
    }

    this.drawHud()
  }

  private drawHud(): void {
    const p = this.world.entities.get(this.playerId)
    if (!p) return
    const inv = (item: string): number => p.inventory?.find((s) => s.item === item)?.count ?? 0
    const lines = [
      `❤ ${Math.ceil(p.hp)}/${p.maxHp}   ⭐ Lv ${p.level}   xp ${Math.floor(p.xp ?? 0)}`,
      `🪓${inv('axe')} ⛏${inv('pick')} 🗡${inv('sword')}`,
      `🪵${inv('wood')} 🪨${inv('stone')} 🍓${inv('berry')} 🍖${inv('meat')}`,
    ]
    this.hud.setText(lines.join('\n'))
  }
}

export default function Game({ dev }: { dev: boolean }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      backgroundColor: '#7cc36b',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [WorldScene],
    })
    return () => game.destroy(true)
  }, [dev])
  return <div ref={ref} style={{ width: '100vw', height: '100vh' }} />
}
