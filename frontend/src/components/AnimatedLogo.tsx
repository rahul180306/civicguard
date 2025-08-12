export default function AnimatedLogo({ size = 28 }: { size?: number }) {
  // Base blobby circle path (approx) then duplicated with small transforms
  const basePath =
    'M50 20 C 70 20 80 35 80 50 C 80 70 65 80 50 80 C 30 80 20 65 20 50 C 20 30 35 20 50 20 Z'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="block"
    >
      {/* faint inner guide ring */}
      <circle cx="50" cy="50" r="28" className="logo-ring" />

      {/* rotating scribble strokes */}
      <g className="logo-rot-slow">
        <path d={basePath} className="logo-stroke logo-blue" />
      </g>
      <g className="logo-rot-med">
        <path d={basePath} className="logo-stroke logo-amber" transform="rotate(22 50 50) scale(0.96 1.04)" style={{ animationDuration: '7s' }} />
      </g>
      <g className="logo-rot-fast">
        <path d={basePath} className="logo-stroke logo-mint" transform="rotate(-17 50 50) scale(1.06 0.98)" style={{ animationDuration: '5.5s' }} />
      </g>

      {/* orbiting dots */}
      <g className="logo-rot-fast" style={{ animationDuration: '10s' }}>
        <circle cx="50" cy="20" r="2.2" className="logo-dot logo-blue" />
        <circle cx="80" cy="50" r="1.9" className="logo-dot logo-amber" />
        <circle cx="50" cy="80" r="1.9" className="logo-dot logo-mint" />
        <circle cx="20" cy="50" r="1.7" className="logo-dot logo-green" />
      </g>
    </svg>
  )
}
