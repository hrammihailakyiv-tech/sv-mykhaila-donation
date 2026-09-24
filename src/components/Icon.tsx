const paths: Record<string, string> = {
  church: 'M12 2v4M10.5 3.5h3M6 21v-8a6 6 0 0 1 12 0v8M3 21h18M10 21v-5a2 2 0 0 1 4 0v5',
  bowl: 'M3 11h18a9 9 0 0 1-18 0zM8 8c0-1.5 1-1.5 1-3M12 8c0-1.5 1-1.5 1-3M16 8c0-1.5 1-1.5 1-3M9 21h6',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a2.5 2.5 0 1 0 0-5M17 14c2.5.3 4 2.6 4 6',
  candle: 'M12 2c1.5 2 1.5 3.5 0 4.5C10.5 5.5 10.5 4 12 2zM12 8v13M9 21h6M9.5 10h5v3h-5z',
  heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
  card: 'M3 6h18v12H3zM3 10h18M6 15h4',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
}

// Невідома іконка з backend → нейтральне серце.
export default function Icon({ name, className = 'h-7 w-7' }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? paths.heart} />
    </svg>
  )
}
