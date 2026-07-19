import { useState, useEffect, type ChangeEvent } from 'react'
import { usePlayersList, myPlayer, useMultiplayerState, useIsHost, getRoomCode, type PlayerState } from 'playroomkit'
import { QRCodeSVG } from 'qrcode.react'
import { getStoredProfile, setStoredProfile, clearStoredProfile } from '../utils/playerStorage'

// Universal lobby (Host/Join, never Desktop/Mobile). Assumes the Network Gate in
// main.tsx already connected PlayroomKit. Dev mode is handled by App (skips lobby).
export default function Lobby({ onStart }: { onStart: () => void }): React.JSX.Element {
  const players = usePlayersList(true)
  const me = myPlayer()
  const host = useIsHost()
  const [gameStart, setGameStart] = useMultiplayerState('gameStart', false)
  // PlayroomKit writes the join link into the page URL itself (e.g.
  // ".../#r=RXXXX"). Reconstructing it manually drops characters, so we just
  // reuse the live URL — it is already in the exact format PlayroomKit expects.
  const roomCode = getRoomCode()
  const joinUrl = roomCode ? window.location.href : null
  const stored = getStoredProfile()
  const [name, setName] = useState<string>(stored?.name ?? '')
  const myName = me?.getState('name') as string | undefined
  const isReady = (me?.getState('ready') as boolean) ?? false

  useEffect(() => {
    if (gameStart) onStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStart])

  const join = (): void => {
    if (!name.trim() || !me) return
    me.setState('name', name.trim(), true)
    me.setState('ready', false, true)
    setStoredProfile({ name: name.trim() })
  }

  const leave = (): void => {
    clearStoredProfile()
    location.reload()
  }

  const toggleReady = (): void => me?.setState('ready', !isReady, true)

  const start = (): void => {
    if (!host) return
    setGameStart(true)
  }

  if (!myName) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6">
        <h1 className="text-5xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          🌿 Joc
        </h1>
        <p className="mb-6 opacity-80">a cozy survival world</p>
        <input
          className="input-cute text-center"
          style={{ width: 280, maxWidth: '90vw' }}
          placeholder="your name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          autoFocus
        />
        <button className="btn-primary mt-3" style={{ width: 280 }} disabled={!name.trim()} onClick={join}>
          ENTER THE WILD
        </button>
      </div>
    )
  }

  // A solo host can start immediately once ready; with others, everyone must be ready.
  const canStart = host && players.length > 0 && (players.length === 1 || players.every((p: PlayerState) => (p.getState('ready') as boolean)))

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="panel p-5 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-extrabold">{host ? '👑 HOST' : '⚡ GUEST'}</h2>
          <span className="font-mono text-sm opacity-70">{players.length} online</span>
        </div>
        <div className="space-y-2 mb-4">
          {players.map((p: PlayerState) => (
            <div key={p.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
              <span className="font-bold">{p.getState('name') as string}</span>
              <span className={(p.getState('ready') as boolean) ? 'text-sky' : 'opacity-60'}>
                {(p.getState('ready') as boolean) ? 'READY' : '…'}
              </span>
            </div>
          ))}
        </div>
        {joinUrl && (
          <div className="flex flex-col items-center mb-4">
            <div className="bg-white p-2 rounded-xl shadow-lg">
              <QRCodeSVG value={joinUrl} size={148} bgColor="#ffffff" fgColor="#1f2933" />
            </div>
            <p className="text-xs opacity-70 mt-2">scan to join this world</p>
            <p className="font-mono text-sm tracking-widest">{roomCode}</p>
          </div>
        )}
        <button className="btn-ghost w-full mb-2" onClick={toggleReady}>
          {isReady ? 'CANCEL READY' : 'READY'}
        </button>
        <button className="btn-primary w-full" disabled={!canStart} onClick={start}>
          {host ? (canStart ? 'START' : 'WAITING…') : 'WAIT FOR HOST'}
        </button>
        <button className="mt-2 w-full text-sm opacity-60" onClick={leave}>
          leave
        </button>
      </div>
    </div>
  )
}
