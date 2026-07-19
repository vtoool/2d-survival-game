import { useState } from 'react'
import Lobby from './components/Lobby'
import Game from './client/game'

export default function App({ dev }: { dev: boolean }): React.JSX.Element {
  // In dev mode we skip the lobby entirely and drop into a local single-player world.
  const [started, setStarted] = useState(dev)
  if (!started) return <Lobby onStart={() => setStarted(true)} />
  return <Game dev={dev} />
}
