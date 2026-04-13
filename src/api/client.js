const BASE = 'https://docmind-backend-s3tu.onrender.com'

async function parseError(res) {
  try {
    const err = await res.json()
    return err.detail || 'Request failed'
  } catch {
    return `Request failed with status ${res.status}`
  }
}

export async function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function listDocuments() {
  const res = await fetch(`${BASE}/documents`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteDocument(docId) {
  const res = await fetch(`${BASE}/documents/${docId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function runBenchmark(docIds, llmProvider) {
  const res = await fetch(`${BASE}/benchmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_ids: docIds, llm_provider: llmProvider }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function* streamQuery({ query, docIds, llmProvider, conversationHistory }) {
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      doc_ids: docIds,
      llm_provider: llmProvider,
      conversation_history: conversationHistory,
    }),
  })

  if (!res.ok) {
    const msg = await parseError(res)
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          yield data
        } catch {}
      }
    }
  }
}