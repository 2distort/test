import type { Firm, ProviderKeys, Room, RunCard, Seat } from './types'
import { isoNow } from './time'

export const SEAT_A: Seat = { id: 'a', name: '2Distort' }
export const SEAT_B: Seat = { id: 'b', name: 'Wes' }

export const DEFAULT_FIRM: Firm = {
  name: 'Two Seat',
  seats: [SEAT_A, SEAT_B],
}

export const EMPTY_KEYS: ProviderKeys = {
  higgsfield: '',
  weavy: '',
  figma: '',
  openai: '',
  anthropic: '',
}

export function emptyRun(payerId: string, at = isoNow()): RunCard {
  return {
    prompt: '',
    pipe: 'higgsfield',
    payerId,
    file: 'still',
    status: 'draft',
    updatedAt: at,
  }
}

export function newRoom(id: string, title: string, kind: Room['kind'], payerId: string, at = isoNow()): Room {
  return {
    id,
    title,
    kind,
    refs: [],
    lastKeep: null,
    lastKill: null,
    brief: [],
    live: emptyRun(payerId, at),
  }
}

export const THIS_SEAT_KEY = 'firm-desk.thisSeat'
export const KEYS_KEY = 'firm-desk.keys'
