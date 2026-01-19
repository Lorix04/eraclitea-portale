export type EditionPackage = {
  id: string
  label: string
  dateFrom: string
  dateTo: string
}

export const EDITION_PACKAGES: EditionPackage[] = [
  {
    id: 'sesto',
    label: 'Policlinico Umberto I - SESTO (15/04/2024 - 13/06/2024)',
    dateFrom: '2024-04-15',
    dateTo: '2024-06-13',
  },
  {
    id: 'quinto',
    label: 'Policlinico Umberto I - QUINTO (08/04/2024 - 20/02/2026)',
    dateFrom: '2024-04-08',
    dateTo: '2026-02-20',
  },
  {
    id: 'quarto',
    label: 'Policlinico Umberto I - QUARTO (04/03/2024 - 06/12/2024)',
    dateFrom: '2024-03-04',
    dateTo: '2024-12-06',
  },
  {
    id: 'terzo',
    label: 'Policlinico Umberto I - TERZO (24/01/2024 - 28/11/2024)',
    dateFrom: '2024-01-24',
    dateTo: '2024-11-28',
  },
  {
    id: 'secondo',
    label: 'Policlinico Umberto I - SECONDO (01/09/2023 - 28/02/2024)',
    dateFrom: '2023-09-01',
    dateTo: '2024-02-28',
  },
  {
    id: 'primo',
    label: 'Policlinico Umberto I - PRIMO (28/03/2023 - 01/08/2023)',
    dateFrom: '2023-03-28',
    dateTo: '2023-08-01',
  },
]

export function getEditionPackage(id?: string | null) {
  if (!id) return null
  return EDITION_PACKAGES.find((pkg) => pkg.id === id) || null
}
