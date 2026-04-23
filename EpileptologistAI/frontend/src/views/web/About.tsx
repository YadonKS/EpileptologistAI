import { Card } from '../../components/ui'

const pipeline = [
  { step: '1', title: 'Signal Acquisition', desc: 'Arduino reads 6 EEG channels at 256 Hz via serial connection', icon: '01', accent: 'from-violet-500/25 via-violet-500/5 to-transparent' },
  { step: '2', title: 'Windowing', desc: '6-second windows (1536 samples) are continuously collected for analysis', icon: '02', accent: 'from-fuchsia-500/25 via-fuchsia-500/5 to-transparent' },
  { step: '3', title: 'Preprocessing', desc: 'Bandpass filtering (0.5-50 Hz), 60 Hz notch filter, and artifact removal', icon: '03', accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent' },
  { step: '4', title: 'Feature Extraction', desc: '216 features extracted: time-domain, frequency-domain, and wavelet features', icon: '04', accent: 'from-amber-500/20 via-amber-500/5 to-transparent' },
  { step: '5', title: 'Seizure Detection', desc: 'XGBoost model detects seizure activity in each 6-second window', icon: '05', accent: 'from-rose-500/20 via-rose-500/5 to-transparent' },
  { step: '6', title: 'Epilepsy Prediction', desc: 'If 2+ seizures are detected in 10 minutes, the patient is predicted to likely develop epilepsy', icon: '06', accent: 'from-violet-400/20 via-fuchsia-500/5 to-transparent' },
] as const

const team = [
  { role: 'ML / Software', desc: 'Data pipeline, model training, frontend dashboard' },
  { role: 'Electrical', desc: 'Arduino firmware, ADC, amplifier circuit, electrode interface' },
]

const metrics = [
  { label: 'Recall', value: '94.4%', color: 'text-emerald-400', glow: 'shadow-emerald-500/15' },
  { label: 'Precision', value: '96.1%', color: 'text-brand-400', glow: 'shadow-violet-500/20' },
  { label: 'F1 Score', value: '95.3%', color: 'text-violet-400', glow: 'shadow-violet-400/15' },
  { label: 'AUROC', value: '99.8%', color: 'text-yellow-400', glow: 'shadow-yellow-500/15' },
] as const

export default function About() {
  return (
    <div className="space-y-12 pb-4">
      <div className="relative mx-auto max-w-2xl text-center">
        <div
          className="pointer-events-none absolute -inset-x-20 -top-16 h-48 bg-[radial-gradient(ellipse_70%_80%_at_50%_0%,rgba(139,92,246,0.18),transparent_65%)]"
          aria-hidden
        />
        <h1 className="font-display relative text-3xl font-semibold tracking-tight text-slate-100 sm:text-[2.125rem]">
          About Epileptologist
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-400">
            AI
          </span>
        </h1>
        <p className="relative mt-4 max-w-prose leading-relaxed text-slate-400">
          A capstone project that uses real-time EEG monitoring and machine learning to
          predict whether a patient is likely to develop epilepsy based on detected seizure patterns.
          This is an educational prototype, not a medical device.
        </p>
      </div>

      <section className="relative">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-32 w-[min(90vw,42rem)] -translate-x-1/2 rounded-full bg-fuchsia-600/5 blur-3xl"
          aria-hidden
        />
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">How it works</h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">6 stages</span>
        </div>

        <div className="relative mx-auto max-w-6xl [perspective:1400px]">
          <div
            className="pointer-events-none absolute inset-x-4 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent lg:block"
            aria-hidden
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6 [transform-style:preserve-3d]">
            {pipeline.map(({ title, desc, icon, accent }, i) => (
              <div key={icon} className="group relative [transform-style:preserve-3d]">
                <div
                  className="relative transform-gpu transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform group-hover:-translate-y-2 group-hover:[transform:translateZ(20px)_rotateX(6deg)_rotateY(-10deg)]"
                  style={{ transitionDelay: `${Math.min(i, 5) * 35}ms` }}
                >
                  <div
                    className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br opacity-60 blur-sm transition-opacity duration-500 group-hover:opacity-100 ${accent}`}
                    aria-hidden
                  />
                  <Card className="relative h-full overflow-hidden border-white/[0.09] bg-surface/90 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/[0.04] transition-shadow duration-500 group-hover:shadow-[0_32px_64px_-24px_rgba(88,28,135,0.35)]">
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40 ${accent}`}
                      aria-hidden
                    />
                    <div className="absolute right-3 top-3 font-mono text-5xl font-black leading-none text-white/[0.04]">
                      {icon}
                    </div>
                    <div className="relative">
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30 shadow-inner shadow-black/40">
                        <span className="font-mono text-sm font-bold text-brand-300">{icon}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{desc}</p>
                    </div>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Card elevated glow="accent" className="relative overflow-hidden border-white/[0.08]">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">Model performance</h2>
          <p className="mt-1 text-xs text-slate-500">Reported metrics on the held-out evaluation set (illustrative).</p>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {metrics.map(({ label, value, color, glow }) => (
              <div
                key={label}
                className="group relative rounded-2xl border border-white/[0.06] bg-black/25 p-4 text-center shadow-inner shadow-black/30 transition-all duration-500 [transform-style:preserve-3d] hover:-translate-y-1 hover:border-white/[0.1] hover:shadow-lg"
              >
                <div
                  className={`pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                  aria-hidden
                />
                <p className={`font-mono text-3xl font-bold tabular-nums sm:text-4xl ${color} ${glow}`}>
                  {value}
                </p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-600">
            Trained on CHB-MIT Scalp EEG Database &middot; XGBoost classifier &middot; 11,233 samples &middot; 6 selected channels
          </p>
        </div>
      </Card>

      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">Team</h2>
        <p className="mt-1 text-xs text-slate-500">Who shipped the prototype.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 md:max-w-3xl">
          {team.map(({ role, desc }, i) => (
            <div
              key={role}
              className="group [perspective:800px]"
            >
              <div className="transform-gpu transition-transform duration-500 ease-out group-hover:[transform:translateZ(8px)_rotateX(3deg)]">
                <Card className="h-full border-white/[0.07] bg-surface/80 transition-shadow duration-500 group-hover:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.75)]">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] font-mono text-xs font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{role}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card elevated className="relative overflow-hidden border-yellow-500/25 bg-gradient-to-br from-yellow-500/[0.07] to-transparent">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/10 shadow-inner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-yellow-400">Disclaimer</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              This application is a university capstone project for educational and demonstration purposes only.
              It is not FDA-approved, not clinically validated, and must not be used to make medical decisions.
              Always consult a licensed neurologist for epilepsy diagnosis and treatment.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
