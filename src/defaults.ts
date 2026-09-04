import { DEFAULT_MODULE_ID, DEFAULT_RECIPE, defaultActiveDials, findPack, STUB_MODULES } from './modules/stubs'
import { compile } from './modules/compiler'
import type { Firm, ModulePack, ProviderKeys, Room, RunCard, Seat } from './types'
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

export function emptyRun(
  payerId: string,
  at = isoNow(),
  modules: ModulePack[] = STUB_MODULES,
  moduleId = DEFAULT_MODULE_ID,
): RunCard {
  const pack = findPack(modules, moduleId)
  const activeDials = defaultActiveDials(pack)
  const recipe = DEFAULT_RECIPE
  const beat = ''
  return {
    beat,
    compiled: compile({ pack, recipe, activeDials, beat, refs: [] }),
    pipe: 'higgsfield',
    payerId,
    recipe,
    moduleId: pack.id,
    activeDials,
    spend: '',
    status: 'draft',
    updatedAt: at,
  }
}

export function newRoom(
  id: string,
  title: string,
  kind: Room['kind'],
  payerId: string,
  at = isoNow(),
  modules: ModulePack[] = STUB_MODULES,
): Room {
  return {
    id,
    title,
    kind,
    refs: [],
    lastKeep: null,
    lastKill: null,
    brief: [],
    live: emptyRun(payerId, at, modules),
  }
}

export const THIS_SEAT_KEY = 'firm-desk.thisSeat'
export const KEYS_KEY = 'firm-desk.keys'
