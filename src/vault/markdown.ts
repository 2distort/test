import { emptyRun } from '../defaults'
import { isoNow } from '../time'
import type {
  BriefNote,
  Firm,
  Keep,
  Kill,
  ModulePack,
  Pipe,
  ProjectKind,
  Room,
  RunCard,
  RunStatus,
  Seat,
} from '../types'
import { recipeFromUnknown } from './modules'

const PIPES: Pipe[] = ['higgsfield', 'weavy', 'figma', 'openai', 'anthropic']
const KINDS: ProjectKind[] = ['client', 'house']
const STATUSES: RunStatus[] = ['draft', 'ready', 'running', 'keep', 'kill']

function asPipe(v: string | undefined, fallback: Pipe): Pipe {
  if (v === 'text') return 'openai'
  return v && (PIPES as string[]).includes(v) ? (v as Pipe) : fallback
}

function asKind(v: string | undefined, fallback: ProjectKind): ProjectKind {
  return v && (KINDS as string[]).includes(v) ? (v as ProjectKind) : fallback
}

function asStatus(v: string | undefined, fallback: RunStatus): RunStatus {
  return v && (STATUSES as string[]).includes(v) ? (v as RunStatus) : fallback
}

function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) return { meta: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end < 0) return { meta: {}, body: raw }
  const block = raw.slice(4, end)
  const body = raw.slice(end + 4).replace(/^\n/, '')
  const meta: Record<string, string> = {}
  for (const line of block.split('\n')) {
    const i = line.indexOf(':')
    if (i <= 0) continue
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return { meta, body }
}

function splitSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {}
  let current = '_pre'
  const buf: string[] = []
  const flush = () => {
    sections[current] = buf.join('\n').replace(/\s+$/, '')
  }
  for (const line of body.split('\n')) {
    const m = /^##\s+(.+)\s*$/.exec(line)
    if (m) {
      flush()
      buf.length = 0
      current = m[1].trim().toLowerCase()
    } else {
      buf.push(line)
    }
  }
  flush()
  return sections
}

function fieldMap(block: string): { fields: Record<string, string>; rest: string } {
  const fields: Record<string, string> = {}
  const lines = block.split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const m = /^([a-zA-Z]+):\s*(.*)$/.exec(line)
    if (!m) break
    fields[m[1].toLowerCase()] = m[2]
    i += 1
  }
  while (i < lines.length && lines[i].trim() === '') i += 1
  return { fields, rest: lines.slice(i).join('\n').trim() }
}

function parseList(block: string): string[] {
  return block
    .split('\n')
    .map((l) => l.replace(/^-\s*/, '').trim())
    .filter((l) => l.length > 0 && l !== 'none')
}

function extractFence(block: string): string {
  const m = /```(?:[a-zA-Z0-9_-]*)\n([\s\S]*?)\n```/.exec(block)
  if (m) return m[1].replace(/\s+$/, '')
  const { rest } = fieldMap(block)
  return rest
}

function extractNamedFence(block: string, label: string): string | null {
  const re = new RegExp('```' + label + '\\n([\\s\\S]*?)\\n```')
  const m = re.exec(block)
  return m ? m[1].replace(/\s+$/, '') : null
}

function parseKeep(block: string): Keep | null {
  const trimmed = block.trim()
  if (!trimmed || trimmed === 'none') return null
  const { fields, rest } = fieldMap(trimmed)
  const compiled = extractNamedFence(trimmed, 'compiled') ?? rest
  const beat = fields.beat || extractNamedFence(trimmed, 'beat') || rest.split('\n')[0] || ''
  if (!compiled && !fields.at) return null
  return {
    at: fields.at ?? isoNow(),
    pipe: asPipe(fields.pipe, 'higgsfield'),
    recipe: recipeFromUnknown(fields.recipe || fields.file),
    moduleId: fields.module ?? '2distort',
    payerId: fields.payer ?? 'a',
    spend: fields.spend ?? '',
    beat,
    compiled,
  }
}

function parseKill(block: string): Kill | null {
  const trimmed = block.trim()
  if (!trimmed || trimmed === 'none') return null
  const { fields, rest } = fieldMap(trimmed)
  const compiled = extractNamedFence(trimmed, 'compiled') ?? rest
  const beat = fields.beat || rest.split('\n')[0] || ''
  if (!compiled && !fields.at) return null
  return {
    at: fields.at ?? isoNow(),
    note: fields.note ?? beat,
    beat,
    compiled,
  }
}

function parseLive(block: string, payerId: string, modules: ModulePack[]): RunCard {
  const base = emptyRun(payerId, isoNow(), modules)
  const { fields } = fieldMap(block)
  const beat = extractNamedFence(block, 'beat') ?? extractFence(block)
  const compiled = extractNamedFence(block, 'compiled') ?? ''
  const activeDials = (fields.dials ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    beat,
    compiled: compiled || base.compiled,
    pipe: asPipe(fields.pipe, base.pipe),
    payerId: fields.payer ?? payerId,
    recipe: recipeFromUnknown(fields.recipe || fields.file),
    moduleId: fields.module ?? base.moduleId,
    activeDials: activeDials.length ? activeDials : base.activeDials,
    spend: fields.spend ?? '',
    status: asStatus(fields.status, 'draft'),
    updatedAt: fields.updated ?? isoNow(),
  }
}

function parseBrief(block: string): BriefNote[] {
  const notes: BriefNote[] = []
  for (const line of parseList(block)) {
    const parts = line.split(' · ')
    if (parts.length >= 3) {
      notes.push({
        id: `${parts[0]}-${notes.length}`,
        at: parts[0],
        seatId: parts[1],
        text: parts.slice(2).join(' · '),
      })
    } else {
      notes.push({
        id: `n-${notes.length}`,
        at: isoNow(),
        seatId: 'a',
        text: line,
      })
    }
  }
  return notes
}

export function parseRoom(raw: string, fallbackId: string, payerId: string, modules: ModulePack[]): Room {
  const { meta, body } = parseFrontMatter(raw)
  const sections = splitSections(body)
  return {
    id: meta.id || fallbackId,
    title: meta.title || headingTitle(sections._pre) || fallbackId,
    kind: asKind(meta.kind, 'house'),
    refs: parseList(sections.refs ?? ''),
    lastKeep: parseKeep(sections['last keep'] ?? ''),
    lastKill: parseKill(sections['last kill'] ?? ''),
    brief: parseBrief(sections.brief ?? ''),
    live: parseLive(sections.live ?? '', payerId, modules),
  }
}

function headingTitle(pre: string | undefined): string {
  if (!pre) return ''
  const m = /^#\s+(.+)$/m.exec(pre)
  return m?.[1]?.trim() ?? ''
}

function yaml(meta: Record<string, string>): string {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${v}`)
  return `---\n${lines.join('\n')}\n---\n`
}

export function serializeRoom(room: Room): string {
  const fm = yaml({
    id: room.id,
    title: room.title,
    kind: room.kind,
    module: room.live.moduleId,
    recipe: room.live.recipe,
    updated: room.live.updatedAt,
  })
  const refs = room.refs.length ? room.refs.map((r) => `- ${r}`).join('\n') : 'none'
  const keep = room.lastKeep
    ? [
        `at: ${room.lastKeep.at}`,
        `module: ${room.lastKeep.moduleId}`,
        `recipe: ${room.lastKeep.recipe}`,
        `pipe: ${room.lastKeep.pipe}`,
        `payer: ${room.lastKeep.payerId}`,
        `spend: ${room.lastKeep.spend}`,
        `beat: ${room.lastKeep.beat.replace(/\n/g, ' ')}`,
        '',
        '```compiled',
        room.lastKeep.compiled,
        '```',
      ].join('\n')
    : 'none'
  const kill = room.lastKill
    ? [
        `at: ${room.lastKill.at}`,
        `note: ${room.lastKill.note}`,
        `beat: ${room.lastKill.beat.replace(/\n/g, ' ')}`,
        '',
        '```compiled',
        room.lastKill.compiled,
        '```',
      ].join('\n')
    : 'none'
  const live = [
    `status: ${room.live.status}`,
    `module: ${room.live.moduleId}`,
    `recipe: ${room.live.recipe}`,
    `pipe: ${room.live.pipe}`,
    `payer: ${room.live.payerId}`,
    `spend: ${room.live.spend}`,
    `dials: ${room.live.activeDials.join(',')}`,
    `updated: ${room.live.updatedAt}`,
    '',
    '```beat',
    room.live.beat,
    '```',
    '',
    '```compiled',
    room.live.compiled,
    '```',
  ].join('\n')
  const brief = room.brief.length
    ? room.brief.map((n) => `- ${n.at} · ${n.seatId} · ${n.text}`).join('\n')
    : 'none'

  return `${fm}
# ${room.title}

## Refs
${refs}

## Last keep
${keep}

## Last kill
${kill}

## Live
${live}

## Brief
${brief}
`
}

export function parseState(
  raw: string,
  fallback: Firm,
): { firm: Firm; activeRoomId: string; activeModuleId: string } {
  const { meta, body } = parseFrontMatter(raw)
  const sections = splitSections(body)
  const seats: Seat[] = [...fallback.seats]
  const seatLines = parseList(sections.seats ?? '')
  for (const line of seatLines) {
    const m = /^([a-zA-Z0-9_-]+):\s*(.+)$/.exec(line)
    if (!m) continue
    const idx = seats.findIndex((s) => s.id === m[1])
    if (idx >= 0) seats[idx] = { id: m[1], name: m[2] }
    else if (seats.length < 2) seats.push({ id: m[1], name: m[2] })
  }
  const firm: Firm = {
    name: meta.firm || fallback.name,
    seats: [seats[0] ?? fallback.seats[0], seats[1] ?? fallback.seats[1]],
  }
  return {
    firm,
    activeRoomId: meta.activeroom || meta.activeRoom || 'live',
    activeModuleId: meta.module || meta.activeModule || '2distort',
  }
}

export function serializeState(firm: Firm, activeRoomId: string, activeModuleId: string): string {
  return `${yaml({
    firm: firm.name,
    activeRoom: activeRoomId,
    module: activeModuleId,
    updated: isoNow(),
  })}
# state

## Seats
- ${firm.seats[0].id}: ${firm.seats[0].name}
- ${firm.seats[1].id}: ${firm.seats[1].name}
`
}

export function serializeIndex(firm: Firm, rooms: Room[]): string {
  const lines = rooms.map(
    (r) => `- [[desk/rooms/${r.id}]] · ${r.kind} · ${r.live.moduleId} · ${r.live.recipe} · ${r.live.status} · ${r.title}`,
  )
  return `# ${firm.name}

${lines.join('\n') || '- (no rooms)'}
`
}

export function slugify(title: string, taken: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'room'
  let slug = base
  let n = 2
  while (taken.has(slug)) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}
