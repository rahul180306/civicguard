import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import AnimatedLogo from '@/components/AnimatedLogo'
import { Comfortaa } from 'next/font/google'

export const metadata: Metadata = {
  title: 'CivicGuard',
  description: 'CivicGuard — citizen issue reporting',
}

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

function Sidebar() {
  const items = [
    { href: '/', label: 'Home', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3z"/></svg>
    )},
    { href: '/intake', label: 'Report', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M3 5h18v2H3V5zm4 6h10v2H7v-2zm-4 6h18v2H3v-2z"/></svg>
    )},
    { href: '/track', label: 'Track', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
    )},
    { href: '/complaints', label: 'Complaints', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M4 4h16v12H5.17L4 17.17V4zm0-2a2 2 0 0 0-2 2v20l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4z"/></svg>
    )},
  ]
  return (
  <aside className="hidden md:flex flex-col items-center gap-6 py-6 text-gray-300 border-r border-white/10 bg-[#1f1f1f]">
  <div className="h-10 w-10 rounded-2xl bg-[#00B4D5] shadow-md hover-lift" />
      <nav className="flex flex-col items-center gap-3">
        {items.map((it, i) => (
          <Link
            key={it.href}
      href={it.href}
    className="group relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white hover-lift"
            style={{ animationDelay: `${i * 40}ms` }}
            title={it.label}
          >
            {/* left rail indicator */}
    <span className="pointer-events-none absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[#00B4D5] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            {it.icon}
            <span className="sr-only">{it.label}</span>
          </Link>
        ))}
      </nav>
  <div className="mt-auto text-[10px] text-gray-500">v0.1</div>
    </aside>
  )
}

function Header() {
  return (
  <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-6">
      <div className="flex items-center gap-4">
        <AnimatedLogo size={56} />
        <h1 className="select-none text-4xl md:text-5xl font-semibold tracking-tight leading-none text-white">CivicGuard</h1>
      </div>
      <div className="flex items-center gap-3">
  <Link href="/intake" className="btn-white">Report</Link>
        <Link href="/track" className="btn-muted">Track</Link>
      </div>
    </header>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={comfortaa.className}>
  <body className="min-h-screen bg-[#000000] text-white">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <div className="grid min-h-screen grid-cols-1 md:grid-cols-[88px_1fr]">
          <Sidebar />
  <div className="flex min-h-screen flex-col overflow-hidden rounded-none md:rounded-l-3xl" style={{background:"linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))", backgroundColor:"#000"}}>
            <Header />
            <main className="px-4 pb-10 pt-6 md:px-6 md:pt-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )}
