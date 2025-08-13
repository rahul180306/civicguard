export const runtime = 'edge'

const BACKEND = process.env.BACKEND_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

export async function POST(req: Request) {
  const upstream = `${BACKEND}/api/intake`
  // We must pass the body through unchanged and preserve content-type
  const res = await fetch(upstream, {
    method: 'POST',
    headers: {
      // Do not forward host/origin, but keep content-type
      'content-type': req.headers.get('content-type') || 'application/octet-stream',
      'accept': 'application/json',
    },
    body: req.body,
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' }
  })
}
