export type ProjectKind = 'client' | 'house'
export type RunStatus = 'draft' | 'ready' | 'running' | 'keep' | 'kill'
export type Pipe = 'higgsfield' | 'weavy' | 'figma' | 'text'
export type FileKind = 'still' | '15s' | 'cut'
export type ProviderId = 'higgsfield' | 'weavy' | 'figma' | 'openai' | 'anthropic'

export type Seat = {
  id: string
  name: string
}

export type Firm = {
  name: string
  seats: [Seat, Seat]
}

export type RunCard = {
  prompt: string
  pipe: Pipe
  payerId: string
  file: FileKind
  status: RunStatus
  updatedAt: string
}

export type Keep = {
  prompt: string
  pipe: Pipe
  file: FileKind
  payerId: string
  at: string
}

export type Kill = {
  prompt: string
  note: string
  at: string
}

export type BriefNote = {
  id: string
  text: string
  at: string
  seatId: string
}

export type Room = {
  id: string
  title: string
  kind: ProjectKind
  refs: string[]
  lastKeep: Keep | null
  lastKill: Kill | null
  brief: BriefNote[]
  live: RunCard
}

export type ProviderKeys = Record<ProviderId, string>

export const PIPES: { id: Pipe; label: string }[] = [
  { id: 'higgsfield', label: 'HF' },
  { id: 'weavy', label: 'Weavy' },
  { id: 'figma', label: 'Figma' },
  { id: 'text', label: 'text' },
]

export const FILES: { id: FileKind; label: string }[] = [
  { id: 'still', label: 'still' },
  { id: '15s', label: '15s' },
  { id: 'cut', label: 'cut' },
]

export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'higgsfield', label: 'Higgsfield' },
  { id: 'weavy', label: 'Weavy' },
  { id: 'figma', label: 'Figma' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'anthropic', label: 'Anthropic' },
]
