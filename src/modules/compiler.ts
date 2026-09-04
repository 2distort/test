import type { ModulePack, RecipeId } from '../types'

export function compile(input: {
  pack: ModulePack
  recipe: RecipeId
  activeDials: string[]
  beat: string
  refs: string[]
}): string {
  const { pack, recipe, activeDials, beat, refs } = input
  const dialLines = pack.dials
    .filter((d) => activeDials.includes(d.id))
    .map((d) => `- ${d.word} · ${d.weight.toFixed(2)}`)
  const lockLines = [...pack.locks, ...refs].map((p) => `- ${p}`)
  const recipeBody = pack.recipes[recipe]?.trim() || recipe

  return [
    '## system',
    pack.system.trim(),
    '',
    '## sheet',
    pack.sheet.trim(),
    '',
    '## dials',
    dialLines.length ? dialLines.join('\n') : 'none',
    '',
    `## recipe · ${recipe}`,
    recipeBody,
    '',
    '## locks',
    lockLines.length ? lockLines.join('\n') : 'none',
    '',
    '## beat',
    beat.trim() || '(empty)',
    '',
  ].join('\n')
}

export function weighDials(
  dials: ModulePack['dials'],
  active: string[],
  verdict: 'keep' | 'kill',
): ModulePack['dials'] {
  const delta = verdict === 'keep' ? 0.08 : -0.08
  return dials.map((d) => {
    if (!active.includes(d.id)) return d
    const next = Math.min(1, Math.max(0, Math.round((d.weight + delta) * 100) / 100))
    return { ...d, weight: next }
  })
}
