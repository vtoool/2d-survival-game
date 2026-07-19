import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { InputState } from '../client/input'

// Universal on-screen controls:
//   - left virtual joystick  → movement
//   - right virtual joystick → aim / where the character looks
//   - right action buttons   → contextual harvest/attack + eat
// Pointer events mean they work for touch AND mouse. They write into the shared
// `input` ref that the Phaser scene reads each frame.

const JOY_RADIUS = 64
const AIM_RADIUS = 56

function Joystick({
  onChange,
  style,
  radius,
}: {
  onChange: (x: number, y: number, active: boolean) => void
  style: CSSProperties
  radius: number
}): React.JSX.Element {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)

  const set = (x: number, y: number): void => {
    onChange(x, y, x !== 0 || y !== 0)
    if (knobRef.current) knobRef.current.style.transform = `translate(${x * radius}px, ${y * radius}px)`
  }

  const move = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!origin.current) return
    let dx = e.clientX - origin.current.x
    let dy = e.clientY - origin.current.y
    const len = Math.hypot(dx, dy)
    if (len > radius) {
      dx = (dx / len) * radius
      dy = (dy / len) * radius
    }
    set(dx / radius, dy / radius)
  }

  const down = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const rect = baseRef.current!.getBoundingClientRect()
    origin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    move(e)
  }

  const up = (): void => {
    origin.current = null
    set(0, 0)
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{
        position: 'absolute',
        width: radius * 2,
        height: radius * 2,
        borderRadius: '50%',
        background: 'rgba(255,247,230,0.30)',
        border: '3px solid rgba(255,247,230,0.65)',
        touchAction: 'none',
        ...style,
      }}
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 52,
          height: 52,
          marginLeft: -26,
          marginTop: -26,
          borderRadius: '50%',
          background: 'rgba(255,247,230,0.85)',
          boxShadow: '0 3px 0 rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}

export default function MobileControls({ input }: { input: React.MutableRefObject<InputState> }): React.JSX.Element {
  return (
    <>
      {/* Left: movement joystick */}
      <Joystick
        radius={JOY_RADIUS}
        style={{ left: 24, bottom: 96 }}
        onChange={(x, y, a) => {
          input.current.moveX = x
          input.current.moveY = y
          input.current.joyActive = a
        }}
      />

      {/* Right: aim joystick */}
      <Joystick
        radius={AIM_RADIUS}
        style={{ right: 120, bottom: 96 }}
        onChange={(x, y, a) => {
          input.current.aimX = x
          input.current.aimY = y
          input.current.aimActive = a
        }}
      />

      {/* Right: action buttons (stacked above the aim joystick) */}
      <div style={{ position: 'absolute', right: 24, bottom: 210, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          onPointerDown={() => (input.current.eatHeld = true)}
          onPointerUp={() => (input.current.eatHeld = false)}
          onPointerCancel={() => (input.current.eatHeld = false)}
          style={{ ...btn('#e85b6b'), width: 60, height: 60, fontSize: 26 }}
        >
          🍓
        </button>
        <button
          onPointerDown={() => (input.current.actionHeld = true)}
          onPointerUp={() => (input.current.actionHeld = false)}
          onPointerCancel={() => (input.current.actionHeld = false)}
          style={{ ...btn('#ffb43b'), width: 76, height: 76, fontSize: 32 }}
        >
          ⚔
        </button>
      </div>
    </>
  )
}

function btn(color: string): CSSProperties {
  return {
    width: 64,
    height: 64,
    borderRadius: '50%',
    border: '3px solid rgba(255,247,230,0.6)',
    background: color,
    color: '#fff',
    fontSize: 28,
    fontWeight: 800,
    touchAction: 'none',
    userSelect: 'none',
    boxShadow: '0 4px 0 rgba(0,0,0,0.25)',
  }
}
