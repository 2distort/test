import { useState, type FormEvent } from 'react'
import { useDesk } from '../store'
import { shortStamp } from '../time'

export function BriefThread() {
  const { room, firm, addBrief } = useDesk()
  const [draft, setDraft] = useState('')
  if (!room) return null

  const last = room.brief[room.brief.length - 1]

  function onAdd(e: FormEvent) {
    e.preventDefault()
    addBrief(draft)
    setDraft('')
  }

  return (
    <details className="brief">
      <summary>
        <span className="chev">▸</span>
        <span className="label">brief</span>
        <span className="brief-preview">{last?.text ?? ''}</span>
      </summary>
      <div className="brief-body">
        {room.brief.map((note) => {
          const who = firm.seats.find((s) => s.id === note.seatId)?.name ?? note.seatId
          return (
            <div className="brief-note" key={note.id}>
              <b>{who}</b> · {shortStamp(note.at)} — {note.text}
            </div>
          )
        })}
        <form className="brief-add" onSubmit={onAdd}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="add line"
            aria-label="brief line"
          />
        </form>
      </div>
    </details>
  )
}
