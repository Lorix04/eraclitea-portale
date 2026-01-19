"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  CloudUpload,
  Upload,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface AttestFile {
  id: string
  idEdizione: string
  codiceFiscale: string
  nomeFile: string
  importazioneAmmessa: 'si' | 'no' | 'attesa'
  esitoAcquisizione: string
}

export default function ImportaAttestatiPage() {
  const [files, setFiles] = useState<File[]>([])
  const [attestati, setAttestati] = useState<AttestFile[]>([])
  const [pageSize, setPageSize] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    idEdizione: '',
    codiceFiscale: '',
    nomeFile: '',
    importazioneAmmessa: 'tutti',
    esitoAcquisizione: '',
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/zip': ['.zip'],
    },
    multiple: true,
  })

  const handleCaricaFile = async () => {
    console.log('Caricamento files:', files)
  }

  const handleImporta = async () => {
    console.log('Importazione attestati')
  }

  const handleAggiorna = () => {
    console.log('Aggiorna lista')
  }

  const totalItems = attestati.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <CloudUpload className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1e3a5f]">Importa Attestati</h1>
          <p className="text-sm text-gray-500">Importa gli attestati</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <div
            {...getRootProps()}
            className={cn(
              'flex items-center gap-4 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400',
            )}
          >
            <input {...getInputProps()} />
            <Button variant="outline" type="button">
              Seleziona...
            </Button>
            <span className="text-gray-500">
              {isDragActive
                ? 'Rilascia i file qui...'
                : '...trascina qui il file da importare'}
            </span>
          </div>

          {files.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">{files.length} file selezionati</div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={files.length === 0} onClick={handleCaricaFile}>
              <CloudUpload className="h-4 w-4 mr-2" />
              Carica file
            </Button>
            <Button variant="outline" disabled={attestati.length === 0} onClick={handleImporta}>
              <Upload className="h-4 w-4 mr-2" />
              Importa
            </Button>
          </div>
          <Button variant="outline" onClick={handleAggiorna}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 w-10">
                  <Checkbox />
                </th>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase">
                    Id Edizione
                    <Filter className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase">
                    Codice fiscale
                    <Filter className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase">
                    Nome file
                    <Filter className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase">
                    Importazione Ammessa
                    <Filter className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
                <th className="p-3 text-left">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-600 uppercase">
                    Esito acquisizione
                    <Filter className="h-3 w-3 text-gray-400" />
                  </div>
                </th>
              </tr>

              <tr className="border-b">
                <td className="p-2"></td>
                <td className="p-2">
                  <Input
                    placeholder="Q"
                    className="h-7 text-xs"
                    value={filters.idEdizione}
                    onChange={(e) => setFilters((f) => ({ ...f, idEdizione: e.target.value }))}
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Q"
                    className="h-7 text-xs"
                    value={filters.codiceFiscale}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, codiceFiscale: e.target.value }))
                    }
                  />
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Q"
                    className="h-7 text-xs"
                    value={filters.nomeFile}
                    onChange={(e) => setFilters((f) => ({ ...f, nomeFile: e.target.value }))}
                  />
                </td>
                <td className="p-2">
                  <Select
                    value={filters.importazioneAmmessa}
                    onValueChange={(v) => setFilters((f) => ({ ...f, importazioneAmmessa: v }))}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tutti">(Tutti)</SelectItem>
                      <SelectItem value="si">Sì</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  <Input
                    placeholder="Q"
                    className="h-7 text-xs"
                    value={filters.esitoAcquisizione}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, esitoAcquisizione: e.target.value }))
                    }
                  />
                </td>
              </tr>
            </thead>

            <tbody>
              {attestati.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    Nessun elemento presente
                  </td>
                </tr>
              ) : (
                attestati.map((att) => (
                  <tr key={att.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Checkbox />
                    </td>
                    <td className="p-3 text-sm">{att.idEdizione}</td>
                    <td className="p-3 text-sm">{att.codiceFiscale}</td>
                    <td className="p-3 text-sm">{att.nomeFile}</td>
                    <td className="p-3 text-sm">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs',
                          att.importazioneAmmessa === 'si'
                            ? 'bg-green-100 text-green-700'
                            : att.importazioneAmmessa === 'no'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700',
                        )}
                      >
                        {att.importazioneAmmessa === 'si'
                          ? 'Sì'
                          : att.importazioneAmmessa === 'no'
                          ? 'No'
                          : 'In attesa'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{att.esitoAcquisizione}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <Filter className="h-4 w-4" />
              Crea filtro
            </button>
            <div className="flex items-center gap-1">
              {[5, 10, 15, 20].map((size) => (
                <button
                  key={size}
                  className={cn(
                    'px-2 py-1 text-sm rounded border',
                    pageSize === size
                      ? 'bg-gray-100 border-gray-300 font-medium'
                      : 'border-transparent hover:bg-gray-100',
                  )}
                  onClick={() => setPageSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              Pagina {currentPage} di {totalPages} ({totalItems} elementi)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 bg-blue-500 text-white text-sm rounded">
                {currentPage}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
