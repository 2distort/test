import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useDesk } from '../store'
import type { ProjectKind } from '../types'

export function RoomStrip() {
  const { rooms, room, setActiveRoom, createRoom } = useDesk()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<ProjectKind>('house')

  function submit(e?: FormEvent) {
    e?.preventDefault()
    createRoom(title, kind)
    setTitle('')
    setKind('house')
    setAdding(false)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setAdding(false)
      setTitle('')
    }
  }

  return (
    <nav className="rooms" aria-label="rooms">
      {rooms.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`room-tab${room?.id === r.id ? ' is-on' : ''}`}
          onClick={() => setActiveRoom(r.id)}
        >
          {r.title}
          <span className="room-kind">{r.kind === 'client' ? 'C' : 'H'}</span>
        </button>
      ))}
      {adding ? (
        <form className="room-new" onSubmit={submit}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onKey}
            placeholder="room"
            aria-label="new room title"
          />
          <span className="kind-toggle">
            <button type="button" className={kind === 'client' ? 'is-on' : ''} onClick={() => setKind('client')}>
              client
            </button>
            <button type="button" className={kind === 'house' ? 'is-on' : ''} onClick={() => setKind('house')}>
              house
            </button>
          </span>
          <button type="submit">add</button>
        </form>
      ) : (
        <button type="button" className="room-add" onClick={() => setAdding(true)} aria-label="new room">
          +
        </button>
      )}
    </nav>
  )
}
