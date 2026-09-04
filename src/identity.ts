import { DEFAULT_FIRM, EMPTY_KEYS, KEYS_KEY, THIS_SEAT_KEY } from './defaults'
import type { ProviderKeys } from './types'

export function loadThisSeat(): string {
  try {
    const raw = localStorage.getItem(THIS_SEAT_KEY)
    if (raw && DEFAULT_FIRM.seats.some((s) => s.id === raw)) return raw
  } catch {
    /* private mode */
  }
  return DEFAULT_FIRM.seats[0].id
}

export function saveThisSeat(id: string): void {
  try {
    localStorage.setItem(THIS_SEAT_KEY, id)
  } catch {
    /* private mode */
  }
}

export function loadKeys(): ProviderKeys {
  try {
    const raw = localStorage.getItem(KEYS_KEY)
    if (!raw) return { ...EMPTY_KEYS }
    const parsed = JSON.parse(raw) as Partial<ProviderKeys>
    return { ...EMPTY_KEYS, ...parsed }
  } catch {
    return { ...EMPTY_KEYS }
  }
}

export function saveKeys(keys: ProviderKeys): void {
  try {
    localStorage.setItem(KEYS_KEY, JSON.stringify(keys))
  } catch {
    /* private mode */
  }
}
