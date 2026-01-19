import { ReactNode } from 'react'

type Step = { icon: ReactNode; title: string; date?: string; status: 'completed'|'current'|'pending' }

export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="relative border-l border-border pl-4">
      {steps.map((s, i) => (
        <li key={i} className="mb-6 ml-2">
          <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ${s.status==='completed'?'bg-success text-white': s.status==='current'?'bg-accent text-white':'bg-gray-200 text-gray-600'}`}>{s.icon}</span>
          <h4 className="text-sm font-medium">{s.title}</h4>
          {s.date && <time className="text-xs text-text-secondary">{s.date}</time>}
        </li>
      ))}
    </ol>
  )
}
