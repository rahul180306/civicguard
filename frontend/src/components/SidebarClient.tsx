"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SidebarClient() {
  const pathname = usePathname()
  const items = [
    { href: '/', label: 'Overview', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
    )},
    { href: '/intake', label: 'Report', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M3 5h18v2H3V5zm4 6h10v2H7v-2zm-4 6h18v2H3v-2z"/></svg>
    )},
    { href: '/track', label: 'Track', icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"/></svg>
    )},
  ]
  return (
    <aside className="hidden md:flex flex-col gap-6 p-4 text-gray-300">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 animate-in" />
      <nav className="flex flex-col gap-2">
        {items.map((it, i) => {
          const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href))
          return (
            <Link key={it.href} href={it.href} className={`hover-lift glass flex items-center gap-3 rounded-xl px-3 py-2 border ${active ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:text-white'}`} style={{animationDelay: `${i*40}ms`}}>
              {it.icon}
              <span className="text-sm">{it.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto text-xs text-gray-500">v0.1</div>
    </aside>
  )
}
