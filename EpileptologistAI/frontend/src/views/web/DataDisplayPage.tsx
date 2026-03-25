import { useState, useMemo } from 'react'
import { Card } from '../../components/ui'
import { Button } from '../../components/ui'
import EEGWaveform from '../../components/EEGWaveform'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

const BAND_COLORS: Record<string, string> = {
  Delta: '#8b5cf6',
  Theta: '#06b6d4',
  Alpha: '#34d399',
  Beta: '#f59e0b',
  Gamma: '#ef4444',
}

function generateBandPowers() {
  return [
    { name: 'Delta', power: 18 + Math.random() * 12, range: '0.5-4 Hz' },
    { name: 'Theta', power: 12 + Math.random() * 8, range: '4-8 Hz' },
    { name: 'Alpha', power: 8 + Math.random() * 10, range: '8-13 Hz' },
    { name: 'Beta', power: 5 + Math.random() * 6, range: '13-30 Hz' },
    { name: 'Gamma', power: 2 + Math.random() * 4, range: '30-50 Hz' },
  ]
}

function generateHistory(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    window: i + 1,
    proba: Math.max(0, Math.min(1, 0.12 + Math.random() * 0.3 + (Math.random() > 0.92 ? 0.4 : 0))),
  }))
}

export default function DataDisplayPage() {
  const [tab, setTab] = useState<'signals' | 'power' | 'history'>('signals')
  const bandPowers = useMemo(generateBandPowers, [])
  const history = useMemo(() => generateHistory(50), [])

  const tabs = [
    { key: 'signals' as const, label: 'EEG Signals' },
    { key: 'power' as const, label: 'Band Power' },
    { key: 'history' as const, label: 'Prediction History' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Data Analysis</h1>
        <p className="text-sm text-slate-500 mt-1">Detailed view of EEG signals, frequency bands, and prediction history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl border border-gray-800/50 w-fit">
        {tabs.map(({ key, label }) => (
          <Button
            key={key}
            variant={tab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* SIGNALS TAB */}
      {tab === 'signals' && (
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h2 className="text-sm font-semibold text-slate-200">Raw EEG Signal</h2>
              <p className="text-xs text-slate-500 mt-0.5">Unfiltered 6-channel recording from device</p>
            </div>
            <div className="p-3">
              <EEGWaveform channels={6} height={280} speed={2} />
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800/50">
              <h2 className="text-sm font-semibold text-slate-200">Filtered Signal</h2>
              <p className="text-xs text-slate-500 mt-0.5">After bandpass (0.5-50 Hz) and notch (60 Hz) filtering</p>
            </div>
            <div className="p-3">
              <EEGWaveform channels={6} height={280} speed={2} />
            </div>
          </Card>
        </div>
      )}

      {/* BAND POWER TAB */}
      {tab === 'power' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Frequency Band Power Distribution</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bandPowers} barSize={48}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#374151' }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#374151' }} label={{ value: 'Power (uV^2)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e2e8f0' }}
                    formatter={(value: number) => [`${value.toFixed(2)} uV^2`, 'Power']}
                  />
                  <Bar dataKey="power" radius={[6, 6, 0, 0]}>
                    {bandPowers.map((entry) => (
                      <Cell key={entry.name} fill={BAND_COLORS[entry.name]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="space-y-3">
            {bandPowers.map((band) => (
              <Card key={band.name} className="flex items-center gap-4 py-4">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${BAND_COLORS[band.name]}15` }}
                >
                  <div className="h-3 w-3 rounded-full" style={{ background: BAND_COLORS[band.name] }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">{band.name}</span>
                    <span className="text-sm font-mono" style={{ color: BAND_COLORS[band.name] }}>
                      {band.power.toFixed(2)} uV<sup>2</sup>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{band.range}</p>
                  <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(band.power / 35) * 100}%`,
                        background: BAND_COLORS[band.name],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-4">
          <Card>
            <h2 className="text-sm font-semibold text-slate-200 mb-4">Seizure Probability per Window</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="window" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#374151' }} label={{ value: 'Window #', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#374151' }} label={{ value: 'Probability', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e2e8f0' }}
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Seizure Probability']}
                  />
                  <Bar dataKey="proba" radius={[2, 2, 0, 0]}>
                    {history.map((entry, i) => (
                      <Cell key={i} fill={entry.proba > 0.5 ? '#ef4444' : '#06b6d4'} fillOpacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm bg-brand-500/70" />
                Normal (&lt; 0.5)
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm bg-red-500/70" />
                Seizure detected (&ge; 0.5)
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Session Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Windows</p>
                <p className="text-lg font-bold font-mono text-slate-200">{history.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Probability</p>
                <p className="text-lg font-bold font-mono text-brand-400">
                  {(history.reduce((s, h) => s + h.proba, 0) / history.length).toFixed(3)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Flagged Windows</p>
                <p className="text-lg font-bold font-mono text-red-400">
                  {history.filter(h => h.proba > 0.5).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Final Verdict</p>
                <p className="text-lg font-bold text-emerald-400">No Seizure</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
