import { useEffect, useState, type FormEvent } from 'react'
import { PIPES } from '../types'
import { useDesk } from '../store'
import { shortStamp } from '../time'

export function KeepStill() {
  const { room, renameRoom, setKind, addRef, removeRef, firm } = useDesk()
  const [refDraft, setRefDraft] = useState('')
  const [title, setTitle] = useState(room?.title ?? '')

  useEffect(() => {
    setTitle(room?.title ?? '')
  }, [room?.id, room?.title])

  if (!room) return null

  const keep = room.lastKeep
  const payer = keep ? firm.seats.find((s) => s.id === keep.payerId)?.name : null
  const pipe = keep ? PIPES.find((p) => p.id === keep.pipe)?.label : null

  function onRef(e: FormEvent) {
    e.preventDefault()
    addRef(refDraft)
    setRefDraft('')
  }

  return (
    <div className="still-wrap cell-pad">
      <div className="room-head">
        <input
          className="room-title"
          value={title}
          aria-label="room title"
          onChange={(e) => {
            const next = e.target.value
            setTitle(next)
            if (next.trim()) renameRoom(next)
          }}
          onBlur={() => renameRoom(title)}
        />
        <span className="kind-toggle">
          <button type="button" className={room.kind === 'client' ? 'is-on' : ''} onClick={() => setKind('client')}>
            client
          </button>
          <button type="button" className={room.kind === 'house' ? 'is-on' : ''} onClick={() => setKind('house')}>
            house
          </button>
        </span>
      </div>

      <div className={`still${keep ? '' : ' still-empty'}`}>
        <div className="still-prompt">{keep?.beat ?? ''}</div>
        {keep ? (
          <div className="still-meta">
            {keep.moduleId} · {keep.recipe} · {pipe} · {payer} · {shortStamp(keep.at)}
          </div>
        ) : null}
      </div>

      <div className="refs">
        <span className="label">refs</span>
        {room.refs.map((ref, i) => (
          <div className="ref-row" key={`${ref}-${i}`}>
            <span>{ref}</span>
            <button type="button" onClick={() => removeRef(i)} aria-label="remove ref">
              ×
            </button>
          </div>
        ))}
        <form className="ref-add" onSubmit={onRef}>
          <input
            value={refDraft}
            onChange={(e) => setRefDraft(e.target.value)}
            placeholder="add ref"
            aria-label="add ref"
          />
        </form>
      </div>
    </div>
  )
}
