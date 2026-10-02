export function ChateauSketch({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 68" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 61h96M12 58h86M17 56V28h76v28M14 28h82M15 25h80M22 23V15h22M66 15h22v8M19 15h28M63 15h28M38 23 55 9l17 14H38ZM44 24h22M46 56V30h18v26M43 57h24M41 60h28" />
      <path d="M26 34h8v11h-8zM76 34h8v11h-8zM26 49h8v7h-8zM76 49h8v7h-8zM51 36a4 4 0 0 1 8 0v9h-8zM51 56V49h8v7M30 34v11m-4-6h8M80 34v11m-4-6h8M55 36v9m-4-5h8M23 15v-5m-2 0h4m62 5v-5m-2 0h4M55 9V4m-2 0h4" />
      <path d="M4 56c-6-11 2-19 6-15-2-10 5-16 9-12M3 61l4-14M99 61l3-15m-5 11c-6-8-2-16 3-15-2-10 6-16 9-8 3 5-1 9-4 11 6 3 3 10-6 12" />
      <circle cx="55" cy="19" r="2.3" />
    </svg>
  )
}

export function Brand({ className = '', sketch = false }: { className?: string; sketch?: boolean }) {
  return (
    <span className={`brand ${className}`}>
      {sketch && <ChateauSketch className="brand-sketch" />}
      <span className="brand-small">Château</span>
      <span className="brand-name">Latour Ségur</span>
      <span className="brand-location">Saint-Émilion · France</span>
    </span>
  )
}
