import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_FIRM, emptyRun, newRoom } from './defaults'
import { loadKeys, loadThisSeat, saveKeys, saveThisSeat } from './identity'
import { isoNow, uid } from './time'
import type { FileKind, Firm, Pipe, ProjectKind, ProviderId, ProviderKeys, Room } from './types'
import { loadHandle, saveHandle } from './vault/idb'
import {
  appendLog,
  canPickDirectory,
  ensureDesk,
  persistActive,
  pickVault,
  queryAccess,
  requestAccess,
  writeRoom,
} from './vault/fs'
import { slugify } from './vault/markdown'

export type VaultGate = 'checking' | 'needed' | 'blocked' | 'ready'

type DeskSnapshot = {
  gate: VaultGate
  vaultName: string | null
  firm: Firm
  rooms: Room[]
  activeRoomId: string
  thisSeatId: string
  keys: ProviderKeys
  settingsOpen: boolean
  writeError: string | null
  lastWriteAt: string | null
  fsOk: boolean
}

type DeskApi = DeskSnapshot & {
  room: Room | null
  openVault: () => Promise<void>
  setActiveRoom: (id: string) => void
  createRoom: (title: string, kind: ProjectKind) => void
  renameRoom: (title: string) => void
  setKind: (kind: ProjectKind) => void
  setPrompt: (text: string) => void
  setPipe: (pipe: Pipe) => void
  setPayer: (id: string) => void
  setFile: (file: FileKind) => void
  markRunning: () => void
  markKeep: () => void
  markKill: () => void
  addRef: (text: string) => void
  removeRef: (index: number) => void
  addBrief: (text: string) => void
  setFirmName: (name: string) => void
  renameSeat: (id: string, name: string) => void
  setThisSeat: (id: string) => void
  setKey: (id: ProviderId, value: string) => void
  setSettingsOpen: (open: boolean) => void
}

const DeskContext = createContext<DeskApi | null>(null)

function seatName(firm: Firm, id: string): string {
  return firm.seats.find((s) => s.id === id)?.name ?? id
}

function readyStatus(prompt: string, status: Room['live']['status']): Room['live']['status'] {
  if (status === 'running' || status === 'keep' || status === 'kill') return status
  return prompt.trim() ? 'ready' : 'draft'
}

export function DeskProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<VaultGate>('checking')
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [firm, setFirm] = useState<Firm>(DEFAULT_FIRM)
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoomId, setActiveRoomId] = useState('live')
  const [thisSeatId, setThisSeatIdState] = useState(loadThisSeat)
  const [keys, setKeysState] = useState<ProviderKeys>(loadKeys)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [lastWriteAt, setLastWriteAt] = useState<string | null>(null)

  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const logRef = useRef('# log\n\n')
  const debounceRef = useRef<number | null>(null)
  const latestRef = useRef({ firm, rooms, activeRoomId })
  latestRef.current = { firm, rooms, activeRoomId }

  const fsOk = canPickDirectory()

  const persist = useCallback(async (next?: { firm: Firm; rooms: Room[]; activeRoomId: string }) => {
    const handle = handleRef.current
    if (!handle) return
    const snap = next ?? latestRef.current
    try {
      await persistActive(handle, snap.firm, snap.rooms, snap.activeRoomId, logRef.current)
      setLastWriteAt(isoNow())
      setWriteError(null)
    } catch (err) {
      setWriteError(err instanceof Error ? err.message : 'write failed')
    }
  }, [])

  const schedulePersist = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void persist()
    }, 450)
  }, [persist])

  const bootFromHandle = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      handleRef.current = handle
      const payload = await ensureDesk(handle, thisSeatId)
      logRef.current = payload.log
      setFirm(payload.firm)
      setRooms(payload.rooms)
      setActiveRoomId(payload.activeRoomId)
      setVaultName(handle.name)
      setGate('ready')
      latestRef.current = {
        firm: payload.firm,
        rooms: payload.rooms,
        activeRoomId: payload.activeRoomId,
      }
    },
    [thisSeatId],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!fsOk) {
        setGate('blocked')
        return
      }
      const stored = await loadHandle()
      if (cancelled) return
      if (!stored) {
        setGate('needed')
        return
      }
      const perm = await queryAccess(stored)
      if (cancelled) return
      if (perm === 'granted') {
        try {
          await bootFromHandle(stored)
        } catch (err) {
          setWriteError(err instanceof Error ? err.message : 'vault read failed')
          setGate('needed')
        }
        return
      }
      handleRef.current = stored
      setVaultName(stored.name)
      setGate('needed')
    })()
    return () => {
      cancelled = true
    }
  }, [bootFromHandle, fsOk])

  const openVault = useCallback(async () => {
    if (!fsOk) return
    try {
      const existing = handleRef.current
      if (existing) {
        const perm = await requestAccess(existing)
        if (perm === 'granted') {
          await bootFromHandle(existing)
          return
        }
      }
      const picked = await pickVault()
      await saveHandle(picked)
      await bootFromHandle(picked)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setWriteError(err instanceof Error ? err.message : 'could not open vault')
    }
  }, [bootFromHandle, fsOk])

  const patchActive = useCallback(
    (fn: (room: Room) => Room, immediate = false) => {
      setRooms((prev) => {
        const next = prev.map((r) => (r.id === latestRef.current.activeRoomId ? fn(r) : r))
        latestRef.current = { ...latestRef.current, rooms: next }
        if (immediate) void persist({ ...latestRef.current, rooms: next })
        else schedulePersist()
        return next
      })
    },
    [persist, schedulePersist],
  )

  const setActiveRoom = useCallback(
    (id: string) => {
      setActiveRoomId(id)
      latestRef.current = { ...latestRef.current, activeRoomId: id }
      void persist({ ...latestRef.current, activeRoomId: id })
    },
    [persist],
  )

  const createRoom = useCallback(
    (title: string, kind: ProjectKind) => {
      const name = title.trim() || 'untitled'
      const id = slugify(name, new Set(latestRef.current.rooms.map((r) => r.id)))
      const room = newRoom(id, name, kind, thisSeatId)
      const roomsNext = [...latestRef.current.rooms, room]
      latestRef.current = { firm, rooms: roomsNext, activeRoomId: id }
      setRooms(roomsNext)
      setActiveRoomId(id)
      const handle = handleRef.current
      if (handle) {
        void (async () => {
          try {
            await writeRoom(handle, room)
            await persist({ firm, rooms: roomsNext, activeRoomId: id })
          } catch (err) {
            setWriteError(err instanceof Error ? err.message : 'write failed')
          }
        })()
      }
    },
    [firm, persist, thisSeatId],
  )

  const renameRoom = useCallback(
    (title: string) => {
      const next = title.trim()
      if (!next) return
      patchActive((r) => ({ ...r, title: next, live: { ...r.live, updatedAt: isoNow() } }))
    },
    [patchActive],
  )

  const setKind = useCallback(
    (kind: ProjectKind) => {
      patchActive((r) => ({ ...r, kind, live: { ...r.live, updatedAt: isoNow() } }))
    },
    [patchActive],
  )

  const setPrompt = useCallback(
    (text: string) => {
      patchActive((r) => ({
        ...r,
        live: {
          ...r.live,
          prompt: text,
          status: readyStatus(text, r.live.status),
          updatedAt: isoNow(),
        },
      }))
    },
    [patchActive],
  )

  const setPipe = useCallback(
    (pipe: Pipe) => {
      patchActive((r) => ({ ...r, live: { ...r.live, pipe, updatedAt: isoNow() } }))
    },
    [patchActive],
  )

  const setPayer = useCallback(
    (id: string) => {
      patchActive((r) => ({ ...r, live: { ...r.live, payerId: id, updatedAt: isoNow() } }))
    },
    [patchActive],
  )

  const setFile = useCallback(
    (file: FileKind) => {
      patchActive((r) => ({ ...r, live: { ...r.live, file, updatedAt: isoNow() } }))
    },
    [patchActive],
  )

  const markRunning = useCallback(() => {
    patchActive(
      (r) => ({
        ...r,
        live: { ...r.live, status: 'running', updatedAt: isoNow() },
      }),
      true,
    )
  }, [patchActive])

  const markKeep = useCallback(() => {
    const current = latestRef.current.rooms.find((r) => r.id === latestRef.current.activeRoomId)
    if (!current || !current.live.prompt.trim()) return
    const at = isoNow()
    logRef.current = appendLog(logRef.current, 'keep', current, seatName(firm, current.live.payerId), at)
    patchActive((r) => {
      const keep = {
        prompt: r.live.prompt,
        pipe: r.live.pipe,
        file: r.live.file,
        payerId: r.live.payerId,
        at,
      }
      return {
        ...r,
        lastKeep: keep,
        live: emptyRun(r.live.payerId, at),
      }
    }, true)
  }, [firm, patchActive])

  const markKill = useCallback(() => {
    const current = latestRef.current.rooms.find((r) => r.id === latestRef.current.activeRoomId)
    if (!current || !current.live.prompt.trim()) return
    const at = isoNow()
    logRef.current = appendLog(logRef.current, 'kill', current, seatName(firm, current.live.payerId), at)
    patchActive((r) => {
      const line = r.live.prompt.trim().split('\n')[0] ?? ''
      return {
        ...r,
        lastKill: { prompt: r.live.prompt, note: line, at },
        live: emptyRun(r.live.payerId, at),
      }
    }, true)
  }, [firm, patchActive])

  const addRef = useCallback(
    (text: string) => {
      const line = text.trim()
      if (!line) return
      patchActive((r) => ({ ...r, refs: [...r.refs, line] }))
    },
    [patchActive],
  )

  const removeRef = useCallback(
    (index: number) => {
      patchActive((r) => ({ ...r, refs: r.refs.filter((_, i) => i !== index) }))
    },
    [patchActive],
  )

  const addBrief = useCallback(
    (text: string) => {
      const line = text.trim()
      if (!line) return
      patchActive((r) => ({
        ...r,
        brief: [...r.brief, { id: uid(), text: line, at: isoNow(), seatId: thisSeatId }],
      }))
    },
    [patchActive, thisSeatId],
  )

  const setFirmName = useCallback(
    (name: string) => {
      const next = { ...firm, name: name.trim() || firm.name }
      setFirm(next)
      latestRef.current = { ...latestRef.current, firm: next }
      schedulePersist()
    },
    [firm, schedulePersist],
  )

  const renameSeat = useCallback(
    (id: string, name: string) => {
      const next: Firm = {
        ...firm,
        seats: [
          firm.seats[0].id === id ? { ...firm.seats[0], name: name.trim() || firm.seats[0].name } : firm.seats[0],
          firm.seats[1].id === id ? { ...firm.seats[1], name: name.trim() || firm.seats[1].name } : firm.seats[1],
        ],
      }
      setFirm(next)
      latestRef.current = { ...latestRef.current, firm: next }
      schedulePersist()
    },
    [firm, schedulePersist],
  )

  const setThisSeat = useCallback((id: string) => {
    setThisSeatIdState(id)
    saveThisSeat(id)
  }, [])

  const setKey = useCallback((id: ProviderId, value: string) => {
    setKeysState((prev) => {
      const next = { ...prev, [id]: value }
      saveKeys(next)
      return next
    })
  }, [])

  const room = rooms.find((r) => r.id === activeRoomId) ?? rooms[0] ?? null

  const api = useMemo<DeskApi>(
    () => ({
      gate,
      vaultName,
      firm,
      rooms,
      activeRoomId: room?.id ?? activeRoomId,
      thisSeatId,
      keys,
      settingsOpen,
      writeError,
      lastWriteAt,
      fsOk,
      room,
      openVault,
      setActiveRoom,
      createRoom,
      renameRoom,
      setKind,
      setPrompt,
      setPipe,
      setPayer,
      setFile,
      markRunning,
      markKeep,
      markKill,
      addRef,
      removeRef,
      addBrief,
      setFirmName,
      renameSeat,
      setThisSeat,
      setKey,
      setSettingsOpen,
    }),
    [
      activeRoomId,
      addBrief,
      addRef,
      createRoom,
      firm,
      fsOk,
      gate,
      keys,
      lastWriteAt,
      markKeep,
      markKill,
      markRunning,
      openVault,
      removeRef,
      renameRoom,
      renameSeat,
      room,
      rooms,
      setActiveRoom,
      setFile,
      setFirmName,
      setKey,
      setKind,
      setPayer,
      setPipe,
      setPrompt,
      setThisSeat,
      settingsOpen,
      thisSeatId,
      vaultName,
      writeError,
    ],
  )

  return <DeskContext.Provider value={api}>{children}</DeskContext.Provider>
}

export function useDesk(): DeskApi {
  const ctx = useContext(DeskContext)
  if (!ctx) throw new Error('useDesk outside DeskProvider')
  return ctx
}
