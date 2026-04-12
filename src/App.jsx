import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import  ChatPanel  from './components/ChatPanel'
import CitationPanel from './components/CitationPanel'
import { listDocuments, runBenchmark } from './api/client'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [selectedDocs, setSelectedDocs] = useState([])
  const [citations, setCitations] = useState([])
  const [llmProvider, setLlmProvider] = useState('groq')
  const [benchmarkData, setBenchmarkData] = useState(null)
  const [benchmarking, setBenchmarking] = useState(false)

  useEffect(() => {
    listDocuments()
      .then(docs => {
        setDocuments(docs)
        setSelectedDocs(docs.map(d => d.doc_id))
      })
      .catch(() => {})
  }, [])

  const handleBenchmark = async () => {
    if (documents.length === 0) return
    setBenchmarking(true)
    setBenchmarkData(null)
    try {
      const results = await runBenchmark(selectedDocs, llmProvider)
      setBenchmarkData(results)
    } catch (e) {
      console.error(e)
    } finally {
      setBenchmarking(false)
    }
  }

  return (
    <div style={s.app}>
      <Sidebar
        documents={documents}
        setDocuments={setDocuments}
        selectedDocs={selectedDocs}
        setSelectedDocs={setSelectedDocs}
      />

      {benchmarkData ? (
        <BenchmarkView data={benchmarkData} onClose={() => setBenchmarkData(null)} />
      ) : (
        <ChatPanel
          documents={documents}
          selectedDocs={selectedDocs}
          llmProvider={llmProvider}
          setLlmProvider={setLlmProvider}
          onCitations={setCitations}
          onBenchmark={handleBenchmark}
        />
      )}

      {citations.length > 0 && !benchmarkData && (
        <CitationPanel citations={citations} onClose={() => setCitations([])} />
      )}

      {benchmarking && (
        <div style={s.overlay}>
          <div style={s.spinner}>
            <div style={s.spinnerDot} />
            <div style={s.spinnerMsg}>Running 10-question evaluation...</div>
            <div style={s.spinnerSub}>This takes 1–2 minutes. Do not close.</div>
          </div>
        </div>
      )}
    </div>
  )
}

function BenchmarkView({ data, onClose }) {
  const { summary, results } = data

  const scoreColor = (score) => {
    if (score >= 0.7) return '#0a6640'
    if (score >= 0.4) return '#92400e'
    return '#991b1b'
  }

  const scoreBg = (score) => {
    if (score >= 0.7) return '#f0fdf4'
    if (score >= 0.4) return '#fffbeb'
    return '#fef2f2'
  }

  return (
    <div style={s.bench}>
      <div style={s.benchHeader}>
        <div>
          <div style={s.benchTitle}>BENCHMARK RESULTS</div>
          <div style={s.benchMeta}>
            {summary.successful}/{summary.total_questions} questions passed · {summary.avg_latency_ms}ms avg latency · {data.llm_provider.toUpperCase()}
          </div>
        </div>
        <button style={s.backBtn} onClick={onClose}>← Back to Chat</button>
      </div>

      <div style={s.scoreCards}>
        {[
          { label: 'OVERALL SCORE', value: Math.round(summary.overall_score * 100) + '%', score: summary.overall_score },
          { label: 'RETRIEVAL SCORE', value: Math.round(summary.avg_retrieval_score * 100) + '%', score: summary.avg_retrieval_score },
          { label: 'ANSWER QUALITY', value: Math.round(summary.avg_quality_score * 100) + '%', score: summary.avg_quality_score },
          { label: 'AVG LATENCY', value: summary.avg_latency_ms + 'ms', score: 0.6 },
        ].map((card, i) => (
          <div key={i} style={s.scoreCard}>
            <div style={s.scoreLabel}>{card.label}</div>
            <div style={{ ...s.scoreValue, color: scoreColor(card.score) }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={s.resultsGrid}>
        {results.map((r, i) => {
          const qs = r.answer_scores?.score ?? r.answer_scores?.quality_score ?? 0
          return (
            <div key={i} style={s.resultCard}>
              <div style={s.resultTop}>
                <span style={s.resultCat}>{r.category?.toUpperCase()}</span>
                <span style={{
                  ...s.resultScore,
                  color: scoreColor(qs),
                  background: scoreBg(qs),
                }}>
                  {r.status === 'success' ? Math.round(qs * 100) + '%' : 'FAILED'}
                </span>
              </div>
              <div style={s.resultQ}>{r.question}</div>
              {r.status === 'success' && (
                <>
                  <div style={s.resultPreview}>{r.answer_preview}</div>
                  <div style={s.resultMeta}>
                    {r.chunks_retrieved} chunks · pages {r.pages_hit?.join(', ')} · {r.latency_ms}ms
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s = {
  app: { height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--bg)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  spinner: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minWidth: 340, boxShadow: 'var(--shadow-md)' },
  spinnerDot: { width: 24, height: 24, border: '3px solid var(--surface-hover)', borderTopColor: 'var(--foreground)', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  spinnerMsg: { fontSize: '1rem', color: 'var(--foreground)', fontWeight: 600 },
  spinnerSub: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  bench: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' },
  benchHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' },
  benchTitle: { fontSize: '1.1rem', color: 'var(--foreground)', fontWeight: 600, letterSpacing: '-0.01em' },
  benchMeta: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' },
  backBtn: { fontSize: '0.85rem', color: 'var(--foreground)', padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', fontWeight: 500, boxShadow: 'var(--shadow-sm)' },
  scoreCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.5rem 2rem', background: 'var(--bg)' },
  scoreCard: { padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' },
  scoreLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' },
  scoreValue: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.02em' },
  resultsGrid: { flex: 1, overflowY: 'auto', padding: '0 2rem 2rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', alignContent: 'start' },
  resultCard: { background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' },
  resultTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  resultCat: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' },
  resultScore: { fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '100px' },
  resultQ: { fontSize: '0.95rem', color: 'var(--foreground)', marginBottom: '0.75rem', fontWeight: 500, lineHeight: 1.5 },
  resultPreview: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  resultMeta: { fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
}