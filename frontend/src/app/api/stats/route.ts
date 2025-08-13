const BACKEND = process.env.BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

export async function GET() {
  const upstream = `${BACKEND}/api/stats`
  const res = await fetch(upstream, { headers: { accept: 'application/json' }, cache: 'no-store' })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' }
  })
}
