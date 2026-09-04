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
import { compile, weighDials } from './modules/compiler'
import { defaultActiveDials, findPack, STUB_MODULES } from './modules/stubs'
import { isoNow, uid } from './time'
import type { Firm, ModulePack, Pipe, ProjectKind, ProviderId, ProviderKeys, RecipeId, Room } from './types'
import { loadHandle, saveHandle } from './vault/idb'
import {
  appendLog,
  canPickDirectory,
  ensureDesk,
  persistActive,
  persistModuleKeep,
  persistModuleWeights,
  pickVault,
  queryAccess,
  requestAccess,
  writeRoom,
} from './vault/fs'
import { slugify } from './vault/markdown'

export type VaultGate = 'checking' | 'needed' | 'blocked' | 'ready'

type Snap = {
  firm: Firm
  rooms: Room[]
  modules: ModulePack[]
  activeRoomId: string
}

type DeskSnapshot = {
  gate: VaultGate
  vaultName: string | null
  firm: Firm
  rooms: Room[]
  modules: ModulePack[]
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
  pack: ModulePack | null
  compiled: string
  openVault: () => Promise<void>
  setActiveRoom: (id: string) => void
  createRoom: (title: string, kind: ProjectKind) => void
  renameRoom: (title: string) => void
  setKind: (kind: ProjectKind) => void
  setBeat: (text: string) => void
  setPipe: (pipe: Pipe) => void
  setPayer: (id: string) => void
  setSpend: (spend: string) => void
  setModule: (id: string) => void
  setRecipe: (id: RecipeId) => void
  toggleDial: (id: string) => void
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

function readyStatus(beat: string, status: Room['live']['status']): Room['live']['status'] {
  if (status === 'running' || status === 'keep' || status === 'kill') return status
  return beat.trim() ? 'ready' : 'draft'
}

function recompile(room: Room, modules: ModulePack[]): Room {
  const pack = findPack(modules, room.live.moduleId)
  const compiled = compile({
    pack,
    recipe: room.live.recipe,
    activeDials: room.live.activeDials.filter((id) => pack.dials.some((d) => d.id === id)),
    beat: room.live.beat,
    refs: room.refs,
  })
  return { ...room, live: { ...room.live, compiled, updatedAt: isoNow() } }
}

export function DeskProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<VaultGate>('checking')
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [firm, setFirm] = useState<Firm>(DEFAULT_FIRM)
  const [rooms, setRooms] = useState<Room[]>([])
  const [modules, setModules] = useState<ModulePack[]>(STUB_MODULES)
  const [activeRoomId, setActiveRoomId] = useState('live')
  const [thisSeatId, setThisSeatIdState] = useState(loadThisSeat)
  const [keys, setKeysState] = useState<ProviderKeys>(loadKeys)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [lastWriteAt, setLastWriteAt] = useState<string | null>(null)

  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const logRef = useRef('# log\n\n')
  const debounceRef = useRef<number | null>(null)
  const latestRef = useRef<Snap>({ firm, rooms, modules, activeRoomId })
  latestRef.current = { firm, rooms, modules, activeRoomId }

  const fsOk = canPickDirectory()
  const memoryOnly =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('mem')

  const persist = useCallback(async (next?: Snap) => {
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
      setModules(payload.modules)
      setActiveRoomId(payload.activeRoomId)
      setVaultName(handle.name)
      setGate('ready')
      latestRef.current = {
        firm: payload.firm,
        rooms: payload.rooms,
        modules: payload.modules,
        activeRoomId: payload.activeRoomId,
      }
    },
    [thisSeatId],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (memoryOnly) {
        const live = newRoom('live', 'live', 'house', thisSeatId, undefined, STUB_MODULES)
        setRooms([live])
        setModules(STUB_MODULES)
        setActiveRoomId('live')
        setVaultName('memory')
        setGate('ready')
        latestRef.current = { firm: DEFAULT_FIRM, rooms: [live], modules: STUB_MODULES, activeRoomId: 'live' }
        return
      }
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
  }, [bootFromHandle, fsOk, memoryOnly, thisSeatId])

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
        const next = prev.map((r) => {
          if (r.id !== latestRef.current.activeRoomId) return r
          return recompile(fn(r), latestRef.current.modules)
        })
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
      const current = latestRef.current.rooms.find((r) => r.id === latestRef.current.activeRoomId)
      const room = newRoom(id, name, kind, thisSeatId, undefined, latestRef.current.modules)
      if (current) {
        room.live = {
          ...room.live,
          moduleId: current.live.moduleId,
          recipe: current.live.recipe,
          pipe: current.live.pipe,
          payerId: thisSeatId,
          activeDials: current.live.activeDials,
        }
        const compiled = recompile(room, latestRef.current.modules)
        Object.assign(room, compiled)
      }
      const roomsNext = [...latestRef.current.rooms, room]
      latestRef.current = { ...latestRef.current, rooms: roomsNext, activeRoomId: id }
      setRooms(roomsNext)
      setActiveRoomId(id)
      const handle = handleRef.current
      if (handle) {
        void (async () => {
          try {
            await writeRoom(handle, room)
            await persist({ ...latestRef.current, rooms: roomsNext, activeRoomId: id })
          } catch (err) {
            setWriteError(err instanceof Error ? err.message : 'write failed')
          }
        })()
      }
    },
    [persist, thisSeatId],
  )

  const renameRoom = useCallback(
    (title: string) => {
      const next = title.trim()
      if (!next) return
      patchActive((r) => ({ ...r, title: next }))
    },
    [patchActive],
  )

  const setKind = useCallback(
    (kind: ProjectKind) => {
      patchActive((r) => ({ ...r, kind }))
    },
    [patchActive],
  )

  const setBeat = useCallback(
    (text: string) => {
      patchActive((r) => ({
        ...r,
        live: { ...r.live, beat: text, status: readyStatus(text, r.live.status) },
      }))
    },
    [patchActive],
  )

  const setPipe = useCallback(
    (pipe: Pipe) => {
      patchActive((r) => ({ ...r, live: { ...r.live, pipe } }))
    },
    [patchActive],
  )

  const setPayer = useCallback(
    (id: string) => {
      patchActive((r) => ({ ...r, live: { ...r.live, payerId: id } }))
    },
    [patchActive],
  )

  const setSpend = useCallback(
    (spend: string) => {
      patchActive((r) => ({ ...r, live: { ...r.live, spend } }))
    },
    [patchActive],
  )

  const setModule = useCallback(
    (id: string) => {
      const pack = findPack(latestRef.current.modules, id)
      patchActive((r) => ({
        ...r,
        live: {
          ...r.live,
          moduleId: pack.id,
          activeDials: defaultActiveDials(pack),
        },
      }))
    },
    [patchActive],
  )

  const setRecipe = useCallback(
    (recipe: RecipeId) => {
      patchActive((r) => ({ ...r, live: { ...r.live, recipe } }))
    },
    [patchActive],
  )

  const toggleDial = useCallback(
    (id: string) => {
      patchActive((r) => {
        const pack = findPack(latestRef.current.modules, r.live.moduleId)
        if (!pack.dials.some((d) => d.id === id)) return r
        const on = r.live.activeDials.includes(id)
        const activeDials = on ? r.live.activeDials.filter((d) => d !== id) : [...r.live.activeDials, id]
        return { ...r, live: { ...r.live, activeDials } }
      })
    },
    [patchActive],
  )

  const markRunning = useCallback(() => {
    patchActive((r) => ({ ...r, live: { ...r.live, status: 'running' } }), true)
  }, [patchActive])

  const applyVerdict = useCallback(
    (verdict: 'keep' | 'kill') => {
      const current = latestRef.current.rooms.find((r) => r.id === latestRef.current.activeRoomId)
      if (!current || !current.live.beat.trim()) return
      const at = isoNow()
      const compiledRoom = recompile(current, latestRef.current.modules)
      logRef.current = appendLog(
        logRef.current,
        verdict,
        compiledRoom,
        seatName(firm, compiledRoom.live.payerId),
        at,
      )

      const pack = findPack(latestRef.current.modules, compiledRoom.live.moduleId)
      const weighed = {
        ...pack,
        dials: weighDials(pack.dials, compiledRoom.live.activeDials, verdict),
      }
      const modulesNext = latestRef.current.modules.map((m) => (m.id === weighed.id ? weighed : m))
      setModules(modulesNext)
      latestRef.current = { ...latestRef.current, modules: modulesNext }

      const handle = handleRef.current
      if (handle) {
        void persistModuleWeights(handle, weighed)
        if (verdict === 'keep') void persistModuleKeep(handle, weighed, compiledRoom.live.compiled, at)
      }

      patchActive((r) => {
        const nextLive = {
          ...emptyRun(r.live.payerId, at, modulesNext, r.live.moduleId),
          pipe: r.live.pipe,
          recipe: r.live.recipe,
          payerId: r.live.payerId,
          spend: r.live.spend,
          moduleId: r.live.moduleId,
          activeDials: r.live.activeDials,
        }
        if (verdict === 'keep') {
          return {
            ...r,
            lastKeep: {
              beat: r.live.beat,
              compiled: compiledRoom.live.compiled,
              pipe: r.live.pipe,
              recipe: r.live.recipe,
              moduleId: r.live.moduleId,
              payerId: r.live.payerId,
              spend: r.live.spend,
              at,
            },
            live: nextLive,
          }
        }
        const line = r.live.beat.trim().split('\n')[0] ?? ''
        return {
          ...r,
          lastKill: {
            beat: r.live.beat,
            compiled: compiledRoom.live.compiled,
            note: line,
            at,
          },
          live: nextLive,
        }
      }, true)
    },
    [firm, patchActive],
  )

  const markKeep = useCallback(() => applyVerdict('keep'), [applyVerdict])
  const markKill = useCallback(() => applyVerdict('kill'), [applyVerdict])

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
  const pack = room ? findPack(modules, room.live.moduleId) : modules[0] ?? null
  const compiled = room?.live.compiled ?? ''

  const api = useMemo<DeskApi>(
    () => ({
      gate,
      vaultName,
      firm,
      rooms,
      modules,
      activeRoomId: room?.id ?? activeRoomId,
      thisSeatId,
      keys,
      settingsOpen,
      writeError,
      lastWriteAt,
      fsOk,
      room,
      pack,
      compiled,
      openVault,
      setActiveRoom,
      createRoom,
      renameRoom,
      setKind,
      setBeat,
      setPipe,
      setPayer,
      setSpend,
      setModule,
      setRecipe,
      toggleDial,
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
      compiled,
      createRoom,
      firm,
      fsOk,
      gate,
      keys,
      lastWriteAt,
      markKeep,
      markKill,
      markRunning,
      modules,
      openVault,
      pack,
      removeRef,
      renameRoom,
      renameSeat,
      room,
      rooms,
      setActiveRoom,
      setBeat,
      setFirmName,
      setKey,
      setKind,
      setModule,
      setPayer,
      setPipe,
      setRecipe,
      setSpend,
      setThisSeat,
      settingsOpen,
      thisSeatId,
      toggleDial,
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
