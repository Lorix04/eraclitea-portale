export default function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="text-sm text-text-secondary" aria-label="breadcrumb">
      <ol className="flex items-center gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {it.href ? <a className="hover:text-text-primary" href={it.href}>{it.label}</a> : <span>{it.label}</span>}
            {i < items.length - 1 && <span>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
