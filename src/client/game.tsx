import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import type { PlayerState } from 'playroomkit'
import { isHost, myPlayer, setState, getState, usePlayersList } from 'playroomkit'
import { World, TILE, type Entity, type Intent } from '../core'
import { serializeWorld, applySnapshot, encodeIntent, decodeIntent, type SnapEntity } from '../net/playroomAdapter'
import { createInputState, type InputState } from './input'
import MobileControls from '../components/MobileControls'
import {
  KENNEY_TEXTURES,
  KENNEY_TINT,
  kenneyTextureFor,
  primTextureFor,
  createPrimitiveTextures,
  DISPLAY,
} from './textures'

const PALETTE = [0x4ea3ff, 0xff8a5b, 0x9b6bff, 0x5bd1a0, 0xffd24e, 0xff6b9d]

const WORLD_W = 64
const WORLD_H = 48
const WORLD_SEED = 1234
const DT = 1 / 30
const SNAPSHOT_HZ = 20

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

/** Choose the contextual action for whatever the player is standing next to. */
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

interface SceneData {
  mode: 'local' | 'net'
  playerId: string
  input: React.MutableRefObject<InputState>
  players?: React.MutableRefObject<PlayerState[]>
}

/** A player avatar: a simple circle (moomoo-style) with a hand + tool that
 *  rotates to follow the aim direction. Code-drawn so it never depends on art. */
class PlayerView {
  container: Phaser.GameObjects.Container
  private body: Phaser.GameObjects.Arc
  private hand: Phaser.GameObjects.Container
  private hp: Phaser.GameObjects.Graphics
  private lastHp = Infinity
  private lastPop = 0

  constructor(scene: Phaser.Scene, color: number) {
    const shadow = scene.add.ellipse(0, 10, 26, 12, 0x000000, 0.15)
    const body = scene.add.circle(0, 0, 10, color)
    body.setStrokeStyle(3, 0xffffff, 0.9)
    const tool = scene.add.rectangle(9, 0, 16, 5, 0xd8d8e0).setStrokeStyle(2, 0x6b6b6b)
    const handDot = scene.add.circle(2, 0, 4, 0xffe0bd)
    const hand = scene.add.container(0, 0, [tool, handDot])
    const hp = scene.add.graphics()
    this.container = scene.add.container(0, 0, [shadow, body, hand, hp])
    this.body = body
    this.hand = hand
    this.hp = hp
  }

  update(e: Entity, scene: Phaser.Scene): void {
    this.container.setPosition(e.pos.x, e.pos.y)
    this.container.setDepth(e.pos.y)
    const f = e.facing ?? { x: 0, y: 1 }
    this.hand.setRotation(Math.atan2(f.y, f.x))

    const frac = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1)
    this.hp.clear()
    this.hp.lineStyle(3, 0x222222, 0.4)
    this.hp.beginPath()
    this.hp.arc(0, 0, 15, 0, Math.PI * 2)
    this.hp.strokePath()
    this.hp.lineStyle(3, frac > 0.3 ? 0x6be36b : 0xff5b5b, 1)
    this.hp.beginPath()
    this.hp.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2)
    this.hp.strokePath()

    if (e.hp < this.lastHp - 0.01) {
      const now = scene.time.now
      if (now - this.lastPop > 220 && !scene.tweens.isTweening(this.body)) {
        this.lastPop = now
        scene.tweens.add({ targets: this.body, scale: { from: 1.3, to: 1 }, duration: 120 })
      }
    }
    this.lastHp = e.hp
  }

  destroy(): void {
    this.container.destroy()
  }
}

class WorldScene extends Phaser.Scene {
  private world!: World
  private playerId = 'hero'
  private mode: 'local' | 'net' = 'local'
  private inputRef!: React.MutableRefObject<InputState>
  private playersRef?: React.MutableRefObject<PlayerState[]>
  private hud!: Phaser.GameObjects.Text
  private keys!: Record<string, Phaser.Input.Keyboard.Key>
  private terrainGfx!: Phaser.GameObjects.Graphics
  private sprites = new Map<string, Phaser.GameObjects.Image>()
  private berryOverlays = new Map<string, Phaser.GameObjects.Image>()
  private players = new Map<string, PlayerView>()
  private lastHp = new Map<string, number>()
  private lastPop = new Map<string, number>()
  private acc = 0
  private snapAcc = 0
  private targets = new Map<string, { x: number; y: number }>()

  constructor() {
    super('world')
  }

  init(data: SceneData): void {
    this.mode = data.mode
    this.playerId = data.playerId
    this.inputRef = data.input
    this.playersRef = data.players
  }

  preload(): void {
    for (const t of KENNEY_TEXTURES) {
      try {
        this.load.image(t.key, t.path)
      } catch {
        /* fall back to primitive textures */
      }
    }
  }

  create(): void {
    this.world = new World({ width: WORLD_W, height: WORLD_H, seed: WORLD_SEED })
    if (this.mode === 'local') {
      scatter(this.world)
      this.world.spawnPlayer({ x: (WORLD_W * TILE) / 2, y: (WORLD_H * TILE) / 2 }, this.playerId)
    } else if (isHost()) {
      scatter(this.world)
      this.ensurePlayers()
    }
    // (net clients rebuild entities from snapshots; terrain already matches via seed)

    createPrimitiveTextures(this)
    this.downscaleTextures()

    this.cameras.main.setBackgroundColor(COLORS.ground)
    this.terrainGfx = this.add.graphics().setDepth(-1000)
    this.bakeTerrain()

    this.hud = this.add
      .text(12, 12, '', { fontFamily: 'Nunito, sans-serif', fontSize: '16px', color: '#fff7e6' })
      .setScrollFactor(0)
      .setDepth(1000)
    const kb = this.input.keyboard!
    this.keys = kb.addKeys('W,A,S,D,SPACE,F') as Record<string, Phaser.Input.Keyboard.Key>
  }

  /** Draw the static ground/walls once into a retained Graphics object. */
  private bakeTerrain(): void {
    const g = this.terrainGfx
    g.clear()
    for (let y = 0; y < this.world.height; y++) {
      for (let x = 0; x < this.world.width; x++) {
        if (this.world.tileAt(x, y) === 1) {
          const wall = x === 0 || y === 0 || x === this.world.width - 1 || y === this.world.height - 1
          g.fillStyle(wall ? COLORS.wall : COLORS.solid, 1)
          g.fillRect(x * TILE, y * TILE, TILE, TILE)
        }
      }
    }
  }

  /** Shrink the 1024px Kenney source textures to a phone-friendly size so the
   *  GPU isn't holding ~25MB of texture memory. Sprites reference the same key. */
  private downscaleTextures(): void {
    const MAX = 256
    for (const t of KENNEY_TEXTURES) {
      if (!this.textures.exists(t.key)) continue
      const src = this.textures.get(t.key).getSourceImage() as HTMLImageElement
      if (!src || !src.width || !src.height) continue
      const scale = Math.min(1, MAX / Math.max(src.width, src.height))
      if (scale >= 1) continue
      const cw = Math.max(1, Math.round(src.width * scale))
      const ch = Math.max(1, Math.round(src.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) continue
      ctx.drawImage(src, 0, 0, cw, ch)
      this.textures.remove(t.key)
      this.textures.addCanvas(t.key, canvas)
    }
  }

  private colorFor(id: string): number {
    let h = 0
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return PALETTE[h % PALETTE.length]
  }

  private ensureSprite(e: Entity): Phaser.GameObjects.Image {
    let s = this.sprites.get(e.id)
    if (s) return s
    const k = kenneyTextureFor(e)
    const key = k && this.textures.exists(k) ? k : primTextureFor(e)
    s = this.add.image(e.pos.x, e.pos.y, key)
    if (k && KENNEY_TINT[k] !== undefined) s.setTint(KENNEY_TINT[k])
    else if (e.kind === 'item') s.setTint(ITEM_COLORS[e.worldItem?.item ?? ''] ?? COLORS.item)
    const d = DISPLAY[e.kind] ?? DISPLAY.item
    const scale = d.h ? d.h / s.height : (d.w ?? 20) / s.width
    s.setScale(scale)
    s.setOrigin(0.5, d.originY)
    this.sprites.set(e.id, s)
    return s
  }

  /** Host only: keep a player entity in sync with the live players list. */
  private ensurePlayers(): void {
    const players = this.playersRef?.current ?? []
    const cx = (WORLD_W * TILE) / 2
    const cy = (WORLD_H * TILE) / 2
    players.forEach((p, idx) => {
      if (!this.world.entities.has(p.id)) {
        const ang = (idx / Math.max(1, players.length)) * Math.PI * 2
        this.world.spawnPlayer({ x: cx + Math.cos(ang) * 80, y: cy + Math.sin(ang) * 80 }, p.id)
      }
    })
    for (const [id, e] of this.world.entities) {
      if (e.kind === 'player' && !players.some((p) => p.id === id)) this.world.remove(id)
    }
  }

  private buildIntent(): Intent {
    const player = this.world.entities.get(this.playerId)
    if (!player) return { move: { x: 0, y: 0 }, action: null, aim: null, craftId: null }
    const move = { x: 0, y: 0 }
    if (this.keys.A.isDown) move.x -= 1
    if (this.keys.D.isDown) move.x += 1
    if (this.keys.W.isDown) move.y -= 1
    if (this.keys.S.isDown) move.y += 1

    const inp = this.inputRef.current
    if (inp.joyActive) {
      move.x += inp.moveX
      move.y += inp.moveY
    }
    move.x = Phaser.Math.Clamp(move.x, -1, 1)
    move.y = Phaser.Math.Clamp(move.y, -1, 1)

    const pointer = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y)
    const aim = inp.aimActive
      ? { x: player.pos.x + inp.aimX * 100, y: player.pos.y + inp.aimY * 100 }
      : { x: pointer.x, y: pointer.y }

    let action: Intent['action'] = null
    if (this.keys.F.isDown || inp.eatHeld) action = 'eat'
    else if (this.keys.SPACE.isDown || this.input.activePointer.isDown || inp.actionHeld) action = pickAction(this.world, player)

    return { move, action, aim, craftId: null }
  }

  update(_t: number, deltaMs: number): void {
    const dt = deltaMs / 1000

    if (this.mode === 'local') {
      this.acc += dt
      let steps = 0
      while (this.acc >= DT && steps < 5) {
        this.world.step(DT, new Map([[this.playerId, this.buildIntent()]]))
        this.acc -= DT
        steps++
      }
    } else if (isHost()) {
      this.ensurePlayers()
      this.acc += dt
      let steps = 0
      while (this.acc >= DT && steps < 5) {
        const intents = new Map<string, Intent>()
        const players = this.playersRef?.current ?? []
        for (const p of players) {
          if (p.id === this.playerId) intents.set(p.id, this.buildIntent())
          else {
            const dec = decodeIntent(p.getState('intent') as string)
            if (dec) intents.set(p.id, dec)
          }
        }
        this.world.step(DT, intents)
        this.acc -= DT
        steps++
      }
      this.snapAcc += dt
      if (this.snapAcc >= 1 / SNAPSHOT_HZ) {
        setState('snapshot', serializeWorld(this.world), true)
        this.snapAcc = 0
      }
    } else {
      // Client: send intent, render the latest authoritative snapshot (interpolated).
      const intent = this.buildIntent()
      myPlayer().setState('intent', encodeIntent(intent), false)
      const raw = getState('snapshot') as SnapEntity[] | undefined
      if (raw) {
        for (const s of raw) this.targets.set(s.i, { x: s.x, y: s.y })
        applySnapshot(this.world, raw)
        const a = Math.min(1, dt * 18)
        for (const e of this.world.entities.values()) {
          const t = this.targets.get(e.id)
          if (t) {
            e.pos.x += (t.x - e.pos.x) * a
            e.pos.y += (t.y - e.pos.y) * a
          }
        }
      }
    }

    this.draw()
    const p = this.world.entities.get(this.playerId)
    if (p) this.cameras.main.centerOn(p.pos.x, p.pos.y)
  }

  private draw(): void {
    // Drop views whose entity is gone.
    for (const [id, s] of this.sprites) {
      if (!this.world.entities.has(id)) {
        s.destroy()
        this.sprites.delete(id)
        this.lastHp.delete(id)
        this.lastPop.delete(id)
      }
    }
    for (const [id, o] of this.berryOverlays) {
      if (!this.world.entities.has(id)) {
        o.destroy()
        this.berryOverlays.delete(id)
      }
    }
    for (const [id, pv] of this.players) {
      if (!this.world.entities.has(id)) {
        pv.destroy()
        this.players.delete(id)
      }
    }

    for (const e of this.world.entities.values()) {
      if (e.kind === 'player') {
        let pv = this.players.get(e.id)
        if (!pv) {
          pv = new PlayerView(this, this.colorFor(e.id))
          this.players.set(e.id, pv)
        }
        pv.update(e, this)
        continue
      }
      const s = this.ensureSprite(e)
      s.setPosition(e.pos.x, e.pos.y)
      s.setDepth(e.pos.y)
      const d = DISPLAY[e.kind]
      if (d?.flipByFacing) s.setFlipX((e.facing?.x ?? 0) < 0)
      const prev = this.lastHp.get(e.id) ?? e.hp
      if (e.hp < prev - 0.01) {
        const now = this.time.now
        const last = this.lastPop.get(e.id) ?? 0
        if (now - last > 220 && !this.tweens.isTweening(s)) {
          this.lastPop.set(e.id, now)
          this.tweens.add({
            targets: s,
            scaleX: s.scaleX * 1.18,
            scaleY: s.scaleY * 1.18,
            duration: 90,
            yoyo: true,
          })
        }
      }
      this.lastHp.set(e.id, e.hp)

      if (e.kind === 'berry') {
        let o = this.berryOverlays.get(e.id)
        if (!o) {
          o = this.add.image(e.pos.x, e.pos.y, 'berry_dots')
          const bd = DISPLAY.berry
          o.setScale(bd.h ? bd.h / o.height : 1)
          o.setOrigin(0.5, bd.originY)
          this.berryOverlays.set(e.id, o)
        }
        o.setPosition(e.pos.x, e.pos.y)
        o.setDepth(e.pos.y + 0.5)
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

/** Local single-player world (dev mode). */
export function GameLocal(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const input = useRef(createInputState())
  useEffect(() => {
    if (!ref.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      backgroundColor: '#7cc36b',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [],
    })
    game.scene.add('world', WorldScene, true, { mode: 'local', playerId: 'hero', input })
    return () => game.destroy(true)
  }, [])
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
      <MobileControls input={input} />
    </div>
  )
}

/** Networked world: host steps authoritatively, clients render snapshots. */
export function GameNet(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const input = useRef(createInputState())
  const players = useRef<PlayerState[]>([])
  // Subscribe to the live players list so the host can drive every client's entity.
  const playersList = usePlayersList(true)
  players.current = playersList
  const me = myPlayer()
  const playerId = me?.id ?? 'hero'
  useEffect(() => {
    if (!ref.current) return
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current,
      backgroundColor: '#7cc36b',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [],
    })
    game.scene.add('world', WorldScene, true, { mode: 'net', playerId, input, players })
    return () => game.destroy(true)
  }, [playerId])
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
      <MobileControls input={input} />
    </div>
  )
}

export default GameLocal
