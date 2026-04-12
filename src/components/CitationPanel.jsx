import { useState } from 'react'
import { X } from 'lucide-react'

export default function CitationPanel({ citations, onClose }) {
  const [hovered, setHovered] = useState(null)
  if (!citations.length) return null

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.label}>SOURCES</span>
          <span style={s.count}>{citations.length} RETRIEVED</span>
        </div>
        <button style={s.close} onClick={onClose}><X size={14} /></button>
      </div>
      <div style={s.list}>
        {citations.map((c, i) => (
          <div
            key={i}
            className="fade-in"
            style={{
              ...s.card,
              ...(hovered === i ? s.cardHover : {}),
              animationDelay: `${i * 0.04}s`,
              opacity: 0,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div style={s.cardTop}>
              <span style={s.rank}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.filename}>{c.filename}</div>
                <div style={s.pageMeta}>
                  Page {c.page}
                  <span style={s.matchScore}>{Math.min(Math.round(c.score * 100), 100)}% match</span>
                </div>
              </div>
            </div>
            <div style={s.chunk}>{c.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  panel: { width: 340, minWidth: 340, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' },
  headerLeft: { display: 'flex', alignItems: 'baseline', gap: '0.75rem' },
  label: { fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600 },
  count: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 },
  close: { color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' },
  list: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  card: { padding: '1.25rem', borderBottom: '1px solid var(--border)', transition: 'background 0.2s', cursor: 'default' },
  cardHover: { background: 'var(--surface-hover)' },
  cardTop: { display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'flex-start' },
  rank: { fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0, fontWeight: 600, background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' },
  filename: { fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.25rem' },
  pageMeta: { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  matchScore: { color: 'var(--success)', fontWeight: 600, background: 'var(--success-bg)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' },
  chunk: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
}