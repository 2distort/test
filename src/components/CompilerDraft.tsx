import { useDesk } from '../store'

export function CompilerDraft() {
  const { compiled, room } = useDesk()
  if (!room) return null

  return (
    <div className="draft-wrap">
      <div className="draft-head">
        <span className="label">draft</span>
        <span className="draft-meta">
          {room.live.moduleId} · {room.live.recipe}
        </span>
      </div>
      <pre className="draft" aria-label="compiled draft">
        {compiled}
      </pre>
    </div>
  )
}
