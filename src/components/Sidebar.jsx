import { useState, useRef } from 'react'
import { FileText, Upload, Trash2, CheckSquare, Square, Loader, AlertCircle } from 'lucide-react'
import { uploadDocument, deleteDocument } from '../api/client'

export default function Sidebar({ documents, setDocuments, selectedDocs, setSelectedDocs }) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef()

  const handleFiles = async (files) => {
    const pdfs = Array.from(files).filter(f => f.name.endsWith('.pdf'))
    if (!pdfs.length) return setError('Only PDF files are supported')
    setUploading(true)
    setError(null)
    for (const file of pdfs) {
      try {
        const doc = await uploadDocument(file)
        setDocuments(prev => [...prev, doc])
        setSelectedDocs(prev => [...prev, doc.doc_id])
      }   catch (e) {
        setError(`Failed to upload ${file.name}: ${e.message}`)
      }
    }
    setUploading(false)
  }

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }
  const handleDelete = async (docId, e) => {
    e.stopPropagation()
    try {
      await deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.doc_id !== docId))
      setSelectedDocs(prev => prev.filter(id => id !== docId))
    } catch (e) { setError(e.message) }
  }
  const toggleDoc = (docId) => setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId])
  const toggleAll = () => setSelectedDocs(selectedDocs.length === documents.length ? [] : documents.map(d => d.doc_id))

  return (
    <aside style={s.sidebar}>
      <div style={s.brand}>
        <div style={s.brandLogo}>DM</div>
        <div>
          <div style={s.brandName}>DocMind</div>
          <div style={s.brandSub}>Document Intelligence</div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionLabel}>DOCUMENTS</div>
        <div
          style={{ ...s.uploadZone, ...(dragOver ? s.uploadActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
          {uploading ? <Loader size={15} style={{ color: 'var(--white)', animation: 'spin 1s linear infinite' }} /> : <Upload size={15} style={{ color: 'rgba(255,255,255,0.6)' }} />}
          <span style={s.uploadText}>{uploading ? `Indexing... (first load may take 30s)` : 'Upload PDF'}</span>
        </div>
      </div>

      {error && <div style={s.error}><AlertCircle size={12} />{error}</div>}

      {documents.length > 0 && (
        <div style={{ ...s.section, flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={s.sectionLabel}>LOADED ({documents.length})</span>
            <button style={s.selectAll} onClick={toggleAll}>{selectedDocs.length === documents.length ? 'Deselect' : 'Select all'}</button>
          </div>
          {documents.map(doc => {
            const selected = selectedDocs.includes(doc.doc_id)
            return (
              <div key={doc.doc_id} style={{ ...s.docRow, ...(selected ? s.docRowActive : {}) }} onClick={() => toggleDoc(doc.doc_id)}>
                {selected ? <CheckSquare size={13} style={{ color: 'var(--white)', flexShrink: 0 }} /> : <Square size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.docName}>{doc.filename}</div>
                  <div style={s.docMeta}>{doc.pages}p · {doc.chunk_count} chunks · {doc.size_kb}kb</div>
                </div>
                <button style={s.deleteBtn} onClick={(e) => handleDelete(doc.doc_id, e)}><Trash2 size={12} /></button>
              </div>
            )
          })}
        </div>
      )}

      {documents.length === 0 && !uploading && (
        <div style={s.empty}>
          <FileText size={28} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '0.5rem' }} />
          <div style={s.emptyText}>Upload research papers,<br />reports, or financial docs</div>
        </div>
      )}

      <div style={s.statusBar}>
        <div style={{ ...s.statusDot, background: selectedDocs.length > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)' }} />
        <span style={s.statusText}>{selectedDocs.length} of {documents.length} active</span>
      </div>
    </aside>
  )
}

const s = {
  sidebar: { width: 280, minWidth: 280, background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  brand: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.5rem', borderBottom: '1px solid var(--sidebar-border)' },
  brandLogo: { width: 32, height: 32, background: 'var(--surface)', color: 'var(--foreground)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', flexShrink: 0 },
  brandName: { fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: '#fff', fontWeight: 600, letterSpacing: '-0.01em' },
  brandSub: { fontSize: '0.7rem', color: 'var(--sidebar-muted)', fontWeight: 500 },
  section: { padding: '1.25rem 1rem' },
  sectionLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--sidebar-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', fontWeight: 600 },
  uploadZone: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', border: '1px dashed var(--sidebar-border)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', background: 'var(--sidebar-surface)' },
  uploadActive: { borderColor: 'var(--sidebar-text)', background: 'rgba(255,255,255,0.05)' },
  uploadText: { fontSize: '0.75rem', color: 'var(--sidebar-text)', fontWeight: 500 },
  error: { margin: '0 1rem', padding: '0.5rem 0.75rem', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', color: '#FCA5A5', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px' },
  selectAll: { fontSize: '0.7rem', color: 'var(--sidebar-muted)', cursor: 'pointer', transition: 'color 0.2s' },
  docRow: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s', marginBottom: '4px' },
  docRowActive: { background: 'var(--sidebar-surface)' },
  docName: { fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, marginBottom: '0.2rem' },
  docMeta: { fontSize: '0.65rem', color: 'var(--sidebar-muted)' },
  deleteBtn: { flexShrink: 0, color: 'var(--sidebar-muted)', display: 'flex', alignItems: 'center', padding: '0.2rem', opacity: 0.6 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center' },
  emptyText: { fontSize: '0.75rem', color: 'var(--sidebar-muted)', lineHeight: 1.6, marginTop: '0.75rem' },
  statusBar: { padding: '0.8rem 1.5rem', borderTop: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', background: 'var(--sidebar-bg)' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  statusText: { fontSize: '0.75rem', color: 'var(--sidebar-text)', fontWeight: 500 },
}