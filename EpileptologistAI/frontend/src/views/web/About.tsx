import { Card } from '../../components/ui'

const pipeline = [
  { step: '1', title: 'Signal Acquisition', desc: 'Arduino reads 6 EEG channels at 256 Hz via serial connection', icon: '01' },
  { step: '2', title: 'Windowing', desc: '6-second windows (1536 samples) are continuously collected for analysis', icon: '02' },
  { step: '3', title: 'Preprocessing', desc: 'Bandpass filtering (0.5-50 Hz), 60 Hz notch filter, and artifact removal', icon: '03' },
  { step: '4', title: 'Feature Extraction', desc: '216 features extracted: time-domain, frequency-domain, and wavelet features', icon: '04' },
  { step: '5', title: 'Seizure Detection', desc: 'XGBoost model detects seizure activity in each 6-second window', icon: '05' },
  { step: '6', title: 'Epilepsy Prediction', desc: 'If 2+ seizures are detected in 10 minutes, the patient is predicted to likely develop epilepsy', icon: '06' },
]

const team = [
  { role: 'ML / Software', desc: 'Data pipeline, model training, frontend dashboard' },
  { role: 'Electrical', desc: 'Arduino firmware, ADC, amplifier circuit, electrode interface' },
  { role: 'Mechanical', desc: 'Device enclosure, electrode placement, ergonomics' },
]

export default function About() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100">
          About Epileptologist<span className="text-brand-400">AI</span>
        </h1>
        <p className="text-slate-400 mt-3 leading-relaxed">
          A capstone project that uses real-time EEG monitoring and machine learning to
          predict whether a patient is likely to develop epilepsy based on detected seizure patterns.
          This is an educational prototype, not a medical device.
        </p>
      </div>

      {/* Pipeline */}
      <div>
        <h2 className="text-lg font-bold text-slate-200 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipeline.map(({ title, desc, icon }) => (
            <Card key={icon} className="relative overflow-hidden">
              <span className="absolute top-4 right-4 text-4xl font-black text-white/[0.03] font-mono">{icon}</span>
              <div className="h-10 w-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                <span className="text-sm font-bold text-brand-400 font-mono">{icon}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Model stats */}
      <Card glow="cyan">
        <h2 className="text-lg font-bold text-slate-200 mb-4">Model Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Recall', value: '94.4%', color: 'text-emerald-400' },
            { label: 'Precision', value: '96.1%', color: 'text-brand-400' },
            { label: 'F1 Score', value: '95.3%', color: 'text-violet-400' },
            { label: 'AUROC', value: '99.8%', color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-4">
          Trained on CHB-MIT Scalp EEG Database &middot; XGBoost classifier &middot; 11,233 samples &middot; 6 selected channels
        </p>
      </Card>

      {/* Team */}
      <div>
        <h2 className="text-lg font-bold text-slate-200 mb-4">Team</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {team.map(({ role, desc }) => (
            <Card key={role}>
              <h3 className="text-sm font-semibold text-slate-200">{role}</h3>
              <p className="text-xs text-slate-500 mt-1.5">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-yellow-400">Disclaimer</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
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
