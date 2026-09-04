import { useDesk } from '../store'

export function BeatPane() {
  const { room, setBeat } = useDesk()
  if (!room) return null

  return (
    <div className="prompt-wrap">
      <div className="prompt-label">
        <span className="label">next</span>
      </div>
      <textarea
        className="prompt"
        value={room.live.beat}
        onChange={(e) => setBeat(e.target.value)}
        placeholder="beat"
        aria-label="next beat"
        autoFocus
      />
    </div>
  )
}
