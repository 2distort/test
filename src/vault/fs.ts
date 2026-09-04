import { DEFAULT_FIRM, newRoom } from '../defaults'
import { DEFAULT_MODULE_ID } from '../modules/stubs'
import { logStamp } from '../time'
import type { Firm, ModulePack, Room } from '../types'
import { parseRoom, parseState, serializeIndex, serializeRoom, serializeState } from './markdown'
import { appendModuleKeep, ensureModules, writeModuleDials } from './modules'

export const DESK_DIR = 'desk'
export const ROOMS_DIR = 'rooms'
export const INDEX_FILE = 'index.md'
export const LOG_FILE = 'log.md'
export const STATE_FILE = 'state.md'

export function canPickDirectory(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

export async function pickVault(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('needs Chromium — File System Access API')
  }
  return window.showDirectoryPicker({
    id: 'firm-desk-vault',
    mode: 'readwrite',
  })
}

export async function queryAccess(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return handle.queryPermission({ mode: 'readwrite' })
}

export async function requestAccess(handle: FileSystemDirectoryHandle): Promise<PermissionState> {
  return handle.requestPermission({ mode: 'readwrite' })
}

async function dir(
  root: FileSystemDirectoryHandle,
  name: string,
  create = true,
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(name, { create })
}

async function writeFile(parent: FileSystemDirectoryHandle, name: string, text: string): Promise<void> {
  const file = await parent.getFileHandle(name, { create: true })
  const writable = await file.createWritable()
  await writable.write(text)
  await writable.close()
}

async function readFile(parent: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    const file = await parent.getFileHandle(name)
    const blob = await file.getFile()
    return blob.text()
  } catch {
    return null
  }
}

export type VaultPayload = {
  firm: Firm
  rooms: Room[]
  modules: ModulePack[]
  activeRoomId: string
  log: string
}

function fallbackRoom(payerId: string, modules: ModulePack[]): Room {
  return newRoom('live', 'live', 'house', payerId, undefined, modules)
}

export async function ensureDesk(root: FileSystemDirectoryHandle, thisSeatId: string): Promise<VaultPayload> {
  const desk = await dir(root, DESK_DIR)
  const roomsDir = await dir(desk, ROOMS_DIR)
  const modules = await ensureModules(desk)

  const stateRaw = await readFile(desk, STATE_FILE)
  const indexRaw = await readFile(desk, INDEX_FILE)
  const logRaw = await readFile(desk, LOG_FILE)

  const parsedState = stateRaw
    ? parseState(stateRaw, DEFAULT_FIRM)
    : { firm: DEFAULT_FIRM, activeRoomId: 'live', activeModuleId: DEFAULT_MODULE_ID }
  const firm = parsedState.firm
  const payerId = firm.seats.some((s) => s.id === thisSeatId) ? thisSeatId : firm.seats[0].id

  const rooms: Room[] = []
  for await (const entry of roomsDir.values()) {
    if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue
    const text = await readFile(roomsDir, entry.name)
    if (!text) continue
    const slug = entry.name.replace(/\.md$/, '')
    rooms.push(parseRoom(text, slug, payerId, modules))
  }

  rooms.sort((a, b) => a.title.localeCompare(b.title))

  if (rooms.length === 0) {
    const live = fallbackRoom(payerId, modules)
    rooms.push(live)
    await writeFile(roomsDir, `${live.id}.md`, serializeRoom(live))
  }

  const activeRoomId = rooms.some((r) => r.id === parsedState.activeRoomId)
    ? parsedState.activeRoomId
    : rooms[0].id

  const log = logRaw ?? '# log\n\n'
  const moduleId = rooms.find((r) => r.id === activeRoomId)?.live.moduleId ?? DEFAULT_MODULE_ID

  if (!stateRaw || !indexRaw || !logRaw) {
    await writeFile(desk, STATE_FILE, serializeState(firm, activeRoomId, moduleId))
    await writeFile(desk, INDEX_FILE, serializeIndex(firm, rooms))
    if (!logRaw) await writeFile(desk, LOG_FILE, log)
  }

  return { firm, rooms, modules, activeRoomId, log }
}

export async function writeRoom(root: FileSystemDirectoryHandle, room: Room): Promise<void> {
  const desk = await dir(root, DESK_DIR)
  const roomsDir = await dir(desk, ROOMS_DIR)
  await writeFile(roomsDir, `${room.id}.md`, serializeRoom(room))
}

export async function writeDeskMeta(
  root: FileSystemDirectoryHandle,
  firm: Firm,
  rooms: Room[],
  activeRoomId: string,
  log: string,
): Promise<void> {
  const desk = await dir(root, DESK_DIR)
  const moduleId = rooms.find((r) => r.id === activeRoomId)?.live.moduleId ?? DEFAULT_MODULE_ID
  await writeFile(desk, STATE_FILE, serializeState(firm, activeRoomId, moduleId))
  await writeFile(desk, INDEX_FILE, serializeIndex(firm, rooms))
  await writeFile(desk, LOG_FILE, log)
}

export async function persistActive(
  root: FileSystemDirectoryHandle,
  firm: Firm,
  rooms: Room[],
  activeRoomId: string,
  log: string,
): Promise<void> {
  const room = rooms.find((r) => r.id === activeRoomId)
  if (room) await writeRoom(root, room)
  await writeDeskMeta(root, firm, rooms, activeRoomId, log)
}

export async function persistModuleWeights(root: FileSystemDirectoryHandle, pack: ModulePack): Promise<void> {
  const desk = await dir(root, DESK_DIR)
  await writeModuleDials(desk, pack)
}

export async function persistModuleKeep(
  root: FileSystemDirectoryHandle,
  pack: ModulePack,
  compiled: string,
  at: string,
): Promise<void> {
  const desk = await dir(root, DESK_DIR)
  await appendModuleKeep(desk, pack, compiled, at)
}

export function appendLog(
  log: string,
  verdict: 'keep' | 'kill',
  room: Room,
  payerName: string,
  at: string,
): string {
  const { live } = room
  const base = log.trim().length > 0 ? `${log.trimEnd()}\n\n` : '# log\n\n'
  const excerpt = live.beat.trim().split('\n')[0]?.slice(0, 200) ?? ''
  return `${base}## ${logStamp(at)} · ${verdict} · ${payerName} · ${live.moduleId} · ${live.recipe} · ${live.pipe} · ${room.id}\n${excerpt}\n`
}
