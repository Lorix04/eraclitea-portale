"use client"
import { useBulkUpdateAttendanceMutation } from '@/hooks/use-attendance'

export default function AttendanceTable({ courseId, sessionId, rows }: { courseId: string; sessionId: string; rows: { employee: any; isPresent: boolean; note?: string|null }[] }) {
  const bulk = useBulkUpdateAttendanceMutation(courseId, sessionId)
  const toggleAll = (checked: boolean) => {
    const attendances = rows.map(r => ({ employeeId: r.employee.id, isPresent: checked }))
    bulk.mutate({ attendances })
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm"><input type="checkbox" onChange={(e)=>toggleAll(e.target.checked)} /> Seleziona tutti</label>
      </div>
      <table className="w-full text-sm bg-white border">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2">Cognome</th>
            <th className="text-left px-3 py-2">Nome</th>
            <th className="text-left px-3 py-2">CF</th>
            <th className="text-left px-3 py-2">Presente</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r)=> (
            <tr key={r.employee.id} className="even:bg-gray-50">
              <td className="px-3 py-2">{r.employee.cognome}</td>
              <td className="px-3 py-2">{r.employee.nome}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.employee.codiceFiscale}</td>
              <td className="px-3 py-2"><input type="checkbox" defaultChecked={r.isPresent} onChange={(e)=>bulk.mutate({ attendances: [{ employeeId: r.employee.id, isPresent: e.target.checked }] })}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
