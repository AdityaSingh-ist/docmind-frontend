import { useState, useRef, useEffect } from 'react'
import { Send, BarChart2, RotateCcw, Zap, Cpu } from 'lucide-react'
import { streamQuery } from '../api/client'

function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^#{1,6}\s+(.*$)/gm, '<strong style="display:block;margin-bottom:0.3rem">$1</strong>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul style="padding-left:1.25rem;margin:0.5rem 0;list-style:disc">$&</ul>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p style="margin-bottom:0.6rem">')
    .replace(/\n/g, '<br/>')
}

const WHY_BETTER = [
  { label: 'Persistent Index', desc: 'ChromaDB stores documents on disk. Upload once, query forever. ChatGPT forgets everything when the tab closes.' },
  { label: 'Multi-Document Search', desc: 'Query across 20+ documents simultaneously. No AI chat interface does this at scale without hitting context limits.' },
  { label: 'Hybrid Retrieval', desc: 'BM25 keyword search + semantic vector search fused via Reciprocal Rank Fusion. Engineered retrieval, not prompt stuffing.' },
  { label: 'Neural Reranking', desc: 'Cross-encoder reranker rescores every retrieved chunk against your query. Eliminates false positives before the LLM sees anything.' },
  { label: 'Data Privacy', desc: 'Runs fully locally. Internal financial reports never leave your machine. Impossible with ChatGPT or Claude.' },
  { label: 'Measurable Accuracy', desc: '10-question benchmark suite scores retrieval coverage, answer quality, and latency per question. Every number is defensible.' },
]

export default function ChatPanel({ documents, selectedDocs, llmProvider, setLlmProvider, onCitations, onBenchmark }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [hoveredChip, setHoveredChip] = useState(null)
  const bottomRef = useRef()
  const inputRef = useRef()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSubmit = async () => {
    const query = input.trim()
    if (!query || streaming) return
    if (documents.length === 0) return setError('No documents loaded.')
    if (selectedDocs.length === 0) return setError('No documents selected.')
    setError(null)
    setInput('')
    const userMsg = { role: 'user', content: query, id: Date.now() }
    const assistantMsg = { role: 'assistant', content: '', id: Date.now() + 1, streaming: true }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    try {
      for await (const event of streamQuery({ query, docIds: selectedDocs, llmProvider, conversationHistory: history })) {
        if (event.type === 'citations') onCitations(event.citations)
        else if (event.type === 'token') setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: m.content + event.content } : m))
        else if (event.type === 'done') setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, streaming: false } : m))
      }
    } catch (e) {
      setError(e.message)
      setMessages(prev => prev.filter(m => m.id !== assistantMsg.id))
    } finally { setStreaming(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }
  const clearChat = () => { setMessages([]); onCitations([]); setError(null) }

  const SUGGESTIONS = [
    'What are the key findings of this document?',
    'Summarize the methodology used',
    'What risks or limitations are mentioned?',
    'Compare insights across all documents',
  ]

  return (
    <div style={s.panel}>
      <div style={s.toolbar}>
        <div style={s.toolbarLeft}>
          <span style={s.terminalLabel}>QUERY TERMINAL</span>
          <span style={s.sep}>·</span>
          <span style={s.docsActive}>
            {selectedDocs.length > 0 ? `${selectedDocs.length} DOC${selectedDocs.length > 1 ? 'S' : ''} ACTIVE` : 'NO DOCS SELECTED'}
          </span>
        </div>
        <div style={s.toolbarRight}>
          <div style={s.toggle}>
            {[['groq', 'Groq', <Zap size={11} />], ['gemini', 'Gemini', <Cpu size={11} />]].map(([val, label, icon]) => (
              <button
                key={val}
                style={{ ...s.toggleBtn, ...(llmProvider === val ? s.toggleActive : {}) }}
                onClick={() => setLlmProvider(val)}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          <button style={s.iconBtn} onClick={onBenchmark} title="Run benchmark"><BarChart2 size={14} /></button>
          {messages.length > 0 && <button style={s.iconBtn} onClick={clearChat}><RotateCcw size={13} /></button>}
        </div>
      </div>

      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.empty}>
            <div style={s.emptyTitle}>Ask anything across your documents</div>
            <div style={s.emptyDesc}>
              DocMind uses hybrid BM25 + semantic retrieval with neural reranking to surface the most relevant passages before generating an answer.
            </div>
            <div style={s.chips}>
              {SUGGESTIONS.map((sg, i) => (
                <button
                  key={i}
                  style={{ ...s.chip, ...(hoveredChip === i ? s.chipHover : {}) }}
                  onMouseEnter={() => setHoveredChip(i)}
                  onMouseLeave={() => setHoveredChip(null)}
                  onClick={() => { setInput(sg); inputRef.current?.focus() }}
                >
                  {sg}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="fade-in" style={s.msg}>
            <div style={s.msgLabel}>
              <span style={{ ...s.msgRole, ...(msg.role === 'assistant' ? s.msgRoleAI : {}) }}>
                {msg.role === 'user' ? 'YOU' : 'DOCMIND'}
              </span>
              {msg.streaming && <span style={s.liveTag}>LIVE</span>}
            </div>
            {msg.role === 'assistant'
              ? <div className="markdown" style={s.aiText} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              : <div style={s.userText}>{msg.content}</div>
            }
            {msg.streaming && <span style={s.cursor}>▋</span>}
          </div>
        ))}

        {error && <div style={s.errorMsg}>⚠ {error}</div>}
        <div ref={bottomRef} />

        <div style={{ ...s.whySection, ...(messages.length > 0 ? s.whySectionCompact : {}) }}>
          <div style={s.whyTitle}>Why DocMind outperforms any AI chatbot</div>
          <div style={s.whyGrid}>
            {WHY_BETTER.map((item, i) => (
              <div key={i} style={s.whyCard}>
                <div style={s.whyCardLabel}>{item.label}</div>
                {messages.length === 0 && <div style={s.whyCardDesc}>{item.desc}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Input Area */}
      <div style={s.inputArea}>
        <div style={s.inputWrapper}>
          <div style={s.prompt}>&gt;</div>
          
          <textarea
            ref={inputRef}
            style={s.textarea}
            placeholder="Ask a question across your indexed documents..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          
          <button 
            style={{ 
              ...s.sendBtn, 
              ...((streaming || !input.trim()) ? s.sendDisabled : {}) 
            }}
            onClick={handleSubmit}
            disabled={streaming || !input.trim()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  panel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' },
  toolbarLeft: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  terminalLabel: { fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600 },
  sep: { color: 'var(--border-strong)', fontSize: '0.85rem' },
  docsActive: { fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  toggle: { display: 'flex', background: 'var(--surface-hover)', borderRadius: '6px', padding: '2px' },
  toggleBtn: { display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '4px', fontWeight: 500 },
  toggleActive: { background: 'var(--surface)', color: 'var(--foreground)', boxShadow: 'var(--shadow-sm)' },
  iconBtn: { padding: '0.4rem', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface)' },
  messages: { flex: 1, overflowY: 'auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px', margin: '0 auto', width: '100%' },
  empty: { paddingBottom: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', marginTop: '2rem' },
  emptyTitle: { fontSize: '1.5rem', color: 'var(--foreground)', marginBottom: '0.75rem', fontWeight: 600, letterSpacing: '-0.02em' },
  emptyDesc: { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', maxWidth: 600 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  chip: { padding: '0.4rem 0.85rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '100px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 },
  chipHover: { background: 'var(--surface-hover)', color: 'var(--foreground)' },
  msg: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  msgLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  msgRole: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  msgRoleAI: { color: 'var(--foreground)' },
  liveTag: { fontSize: '0.65rem', color: 'var(--success)', background: 'var(--success-bg)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 },
  userText: { fontSize: '1rem', color: 'var(--foreground)', lineHeight: 1.6, fontWeight: 500, padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' },
  aiText: { fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.7 },
  cursor: { color: 'var(--foreground)', animation: 'pulse 0.8s step-end infinite' },
  errorMsg: { fontSize: '0.85rem', color: 'var(--danger)', background: 'var(--danger-bg)', padding: '0.75rem', borderRadius: '6px', display: 'inline-block' },
  whySection: { paddingTop: '2rem' },
  whySectionCompact: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' },
  whyTitle: { fontSize: '1.1rem', color: 'var(--foreground)', fontWeight: 600, marginBottom: '1.25rem', letterSpacing: '-0.01em' },
  whyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  whyCard: { padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' },
  whyCardLabel: { fontSize: '0.85rem', color: 'var(--foreground)', fontWeight: 600, marginBottom: '0.5rem' },
  whyCardDesc: { fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  inputArea: { padding: '1.25rem', background: 'var(--bg)', borderTop: '1px solid var(--border)' },
  inputWrapper: { display: 'flex', alignItems: 'flex-end', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)', maxWidth: '800px', margin: '0 auto', transition: 'border-color 0.2s' },
  prompt: { fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '2px' },
  textarea: { flex: 1, background: 'transparent', border: 'none', fontSize: '0.95rem', color: 'var(--foreground)', resize: 'none', outline: 'none', lineHeight: 1.5, maxHeight: 150, overflowY: 'auto' },
  sendBtn: { width: 32, height: 32, background: 'var(--foreground)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', flexShrink: 0 },
  sendDisabled: { opacity: 0.5, cursor: 'not-allowed' },
}