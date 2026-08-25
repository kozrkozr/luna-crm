/**
 * Spike fixtures. Mirrors the prototype's demo state, including its "(демо)"
 * tagging so nothing reads as a real person or shoot.
 *
 * Entity names follow the glossary / data-model.md: Shoot, CrewMember,
 * Reference, AccessLink. No backend in this spike — S-1 and S-2 answer UI
 * and export questions only.
 */

export type ShootStatus = 'new' | 'finished'
export type CrewResponse = 'pending' | 'confirmed' | 'declined'

export type Reference = {
  id: string
  label: string
}

export type CrewMember = {
  id: string
  name: string
  role: string
  contact: string
  instagram: string
  note: string
  noteHasImage: boolean
  response: CrewResponse
}

export type Shoot = {
  id: string
  clientName: string
  clientContact: string
  date: string
  status: ShootStatus
  locationAddress: string
  locationNote: string
  rawFilesUrl: string
  finishedPhotosUrl: string
  references: Reference[]
  crew: CrewMember[]
}

export const REFERENCE_DISPLAY_LIMIT = 4

export const REFERENCE_COLORS = [
  '#b8562f', '#5b7d8c', '#8a6bb0', '#3e8e6b', '#a06a1c', '#5b7d8c',
]

export const SHOOTS: Shoot[] = [
  {
    id: 's1',
    clientName: 'Марія (демо)',
    clientContact: '+380 67 123 45 67',
    date: '2026-09-05',
    status: 'new',
    locationAddress: 'Студія «Світло», Київ (демо)',
    locationNote: '',
    rawFilesUrl: '',
    finishedPhotosUrl: '',
    references: [
      { id: 'r1', label: 'Референс 1 (демо)' },
      { id: 'r2', label: 'Референс 2 (демо)' },
      { id: 'r3', label: 'Референс 3 (демо)' },
      { id: 'r4', label: 'Референс 4 (демо)' },
      { id: 'r5', label: 'Референс 5 (демо)' },
    ],
    crew: [
      {
        id: 'c1',
        name: 'Оксана (демо)',
        role: 'Візажист',
        contact: '+380 50 987 65 43',
        instagram: '@oksana.demo',
        note: 'Працює швидко, привозить свій набір (демо)',
        noteHasImage: false,
        response: 'confirmed',
      },
      {
        id: 'c2',
        name: 'Ігор (демо)',
        role: 'Гафер',
        contact: 'igor.demo@example.com',
        instagram: '',
        note: '',
        noteHasImage: false,
        response: 'pending',
      },
    ],
  },
  {
    id: 's2',
    clientName: 'Олена (демо)',
    clientContact: 'olena.demo@example.com',
    date: '2026-09-19',
    status: 'finished',
    locationAddress: 'Лофт «Ангар», Київ (демо)',
    locationNote: '',
    rawFilesUrl: 'https://fex.net/s/demo-raw',
    finishedPhotosUrl: '',
    references: [{ id: 'r6', label: 'Референс 1 (демо)' }],
    crew: [],
  },
]

export const findShoot = (id: string): Shoot | undefined =>
  SHOOTS.find((shoot) => shoot.id === id)

/**
 * Stand-in for the link gateway's token resolution (ADR-013). In the real
 * build this is an Edge Function that also shapes the payload per audience;
 * here it only has to prove a token-shaped URL can render statically.
 */
export const CREW_TOKENS: Record<string, { shootId: string; crewMemberId: string }> = {
  'demo-crew-token': { shootId: 's1', crewMemberId: 'c2' },
}

export const resolveCrewToken = (token: string) => {
  const link = CREW_TOKENS[token]
  if (!link) return null
  const shoot = findShoot(link.shootId)
  if (!shoot) return null
  const crewMember = shoot.crew.find((member) => member.id === link.crewMemberId)
  if (!crewMember) return null
  return { shoot, crewMember }
}
