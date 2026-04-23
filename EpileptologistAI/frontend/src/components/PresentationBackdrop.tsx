import { useId } from 'react'

export default function PresentationBackdrop() {
  const uid = useId().replace(/:/g, '')

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-10%,rgba(124,58,237,0.22),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_95%_15%,rgba(236,72,153,0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_5%_85%,rgba(167,139,250,0.1),transparent_50%)]" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 15%, transparent 75%)',
        }}
      />

      <div className="absolute inset-0 isolate">
        <div className="absolute inset-0 [perspective:1400px] [perspective-origin:48%_40%]">
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            <div
              className="absolute left-[4%] top-[20%] h-40 w-[7.5rem] rounded-2xl border border-white/[0.09] bg-gradient-to-br from-violet-500/[0.1] via-violet-500/[0.02] to-transparent shadow-[0_48px_120px_-48px_rgba(0,0,0,0.85)] will-change-transform sm:h-48 sm:w-36 [transform-style:preserve-3d] animate-depth-plane-a"
            />
            <div
              className="absolute right-[2%] top-[14%] h-36 w-40 rounded-[1.35rem] border border-white/[0.07] bg-gradient-to-tl from-fuchsia-500/[0.08] via-transparent to-violet-600/[0.03] shadow-[0_56px_140px_-56px_rgba(88,28,135,0.5)] will-change-transform sm:h-44 sm:w-52 [transform-style:preserve-3d] animate-depth-plane-b"
            />
            <div
              className="absolute bottom-[6%] left-[14%] h-24 w-48 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.04] to-transparent opacity-90 will-change-transform sm:h-32 sm:w-64 [transform-style:preserve-3d] animate-depth-plane-c"
            />
            <div
              className="absolute left-1/2 top-[36%] hidden h-[min(70vw,28rem)] w-[min(70vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/[0.08] sm:block [transform:rotateX(68deg)] [transform-style:preserve-3d] animate-depth-shard"
            />
          </div>
        </div>

        <div className="absolute left-1/2 top-[42%] z-[1] w-[min(100vw,640px)] -translate-x-1/2 -translate-y-1/2 opacity-[0.42] sm:opacity-[0.52]">
          <div className="relative aspect-[4/3] [perspective:900px]">
            <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d] animate-presentation-orbit">
              <svg
                viewBox="0 0 400 280"
                className="h-auto w-full max-h-[min(42vh,320px)]"
                fill="none"
              >
                <defs>
                  <linearGradient id={`wire-a-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="rgb(192, 132, 252)" stopOpacity="0.95" />
                    <stop offset="0.5" stopColor="rgb(244, 114, 182)" stopOpacity="0.5" />
                    <stop offset="1" stopColor="rgb(167, 139, 250)" stopOpacity="0.35" />
                  </linearGradient>
                  <linearGradient id={`wire-b-${uid}`} x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop stopColor="rgb(244, 114, 182)" stopOpacity="0.55" />
                    <stop offset="1" stopColor="rgb(139, 92, 246)" stopOpacity="0.25" />
                  </linearGradient>
                </defs>
                <g strokeWidth="1.15" strokeLinecap="round">
                  <ellipse
                    cx="200"
                    cy="140"
                    rx="118"
                    ry="42"
                    stroke={`url(#wire-a-${uid})`}
                    transform="rotate(-18 200 140)"
                  />
                  <ellipse
                    cx="200"
                    cy="140"
                    rx="118"
                    ry="42"
                    stroke={`url(#wire-b-${uid})`}
                    transform="rotate(34 200 140)"
                  />
                  <ellipse
                    cx="200"
                    cy="140"
                    rx="118"
                    ry="42"
                    stroke={`url(#wire-a-${uid})`}
                    transform="rotate(78 200 140)"
                    opacity="0.7"
                  />
                  <path
                    d="M 82 168 Q 200 52 318 168"
                    stroke={`url(#wire-b-${uid})`}
                    opacity="0.85"
                  />
                  <path
                    d="M 96 200 Q 200 96 304 200"
                    stroke={`url(#wire-a-${uid})`}
                    opacity="0.5"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl animate-pulse-slow" />
      <div className="absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl animate-pulse-slow [animation-delay:1.2s]" />
    </div>
  )
}
