import { EdizioniTable, type Edizione } from '@/components/tables/edizioni-table'
import { Building2 } from 'lucide-react'

const mockData: Edizione[] = [
  {
    id: '1',
    corsoNome: 'Formazione Generale (4h)',
    codice: 'CDFC04/319',
    dal: '04/12/2025',
    al: '04/12/2025',
    locazione: 'Via Magenta, 12\n00185 Roma\nHotel Milani Sala Milani',
    partecipantiPrevisti: 35,
    iscrizioni: 9,
    fase: 'Conclusa',
    allegati: 15,
    note: '',
    azienda: 'Policlinico Umberto I',
  },
  {
    id: '2',
    corsoNome: 'Aggiornamento Antincendio Rischio Alto (8h)',
    codice: 'CDFA06/221',
    dal: '15/11/2025',
    al: '15/11/2025',
    locazione: 'Viale del Policlinico, 155\n00161 Roma\nAula 2',
    partecipantiPrevisti: 30,
    iscrizioni: 12,
    fase: 'Pubblicata',
    allegati: 6,
    note: 'Presenze obbligatorie',
    azienda: 'Policlinico Umberto I',
  },
]

export default function TutoraggioEdizioniPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-lg">
          <Building2 className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">EDIZIONI</h1>
          <p className="text-sm text-gray-500">Elenco delle edizioni dei corsi da seguire.</p>
        </div>
      </div>

      <EdizioniTable data={mockData} variant="tutoraggio" />
    </div>
  )
}
