import { EdizioniTable, type Edizione } from '@/components/tables/edizioni-table'
import { Building2 } from 'lucide-react'

const mockData: Edizione[] = [
  {
    id: '1',
    corsoNome: 'Corso lavoratori parte specifica rischio alto (12h)',
    codice: 'CDFB09/23',
    dal: '28/07/2023',
    al: '01/08/2023',
    oraInizio: '08:00:00',
    oraFine: '14:00:00',
    locazione: 'Viale del Policlinico, 155\n00161 ROMA\nEdificio 26 - Radiologia Piano Terra',
    partecipantiPrevisti: 35,
    iscrizioni: 34,
    fase: 'Conclusa',
    azienda: 'Policlinico Umberto I',
    riservata: false,
  },
  {
    id: '2',
    corsoNome: 'Formazione Preposti (8h)',
    codice: 'CDFB12/77',
    dal: '10/09/2024',
    al: '11/09/2024',
    oraInizio: '09:00:00',
    oraFine: '13:00:00',
    locazione: 'Via del Policlinico, 155\n00161 ROMA\nEdificio 3 - Aula Magna',
    partecipantiPrevisti: 25,
    iscrizioni: 8,
    fase: 'Pubblicata',
    azienda: 'Policlinico Umberto I',
    riservata: true,
  },
]

export default function AziendaEdizioniPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-lg">
          <Building2 className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">EDIZIONI</h1>
          <p className="text-sm text-gray-500">Elenco delle edizioni dei corsi offerti per la formazione.</p>
        </div>
      </div>

      <EdizioniTable data={mockData} variant="azienda" />
    </div>
  )
}
