import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { Button } from '../../components/ui'
import { Input } from '../../components/ui'
import { Settings, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import EEGWaveform from '../../components/EEGWaveform'
import StatusBadge from '../../components/StatusBadge'
import MetricCard from '../../components/MetricCard'
import { useAuth } from '../../lib/auth'
import { useMonitoring } from '../../lib/monitoring'
import { getUserSessions, type SessionRecord } from '../../lib/sessions'
import { defaultAccountSettings, getAccountSettings, saveAccountSettings, type AccountSettings } from '../../lib/accountSettings'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SettingsSwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-3.5 last:border-b-0">
      <div className="min-w-0 pr-2">
        <p id={`${id}-label`} className="text-sm font-medium text-slate-200">
          {label}
        </p>
        {description ? (
          <p id={`${id}-desc`} className="mt-1 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a12]',
          checked ? 'justify-end bg-brand-600' : 'justify-start bg-slate-700'
        )}
      >
        <span className="block h-5 w-5 rounded-full bg-white shadow-md" />
      </button>
    </div>
  )
}

export default function HomeWeb() {
  const { user, signOut } = useAuth()
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<AccountSettings>(defaultAccountSettings)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const {
    connectionStatus,
    monitoringStatus,
    signalQualityState,
    signalQualityScore,
    signalQualityMessage,
    backendError,
    lastPrediction,
    lastWindowData,
    completion,
    elapsedSeconds,
    isConnected,
    isMonitoring,
    connectDevice,
    disconnectDevice,
    startMonitoring,
    stopMonitoring,
    checkSignalQuality,
    clearBackendError,
    setEmailAlertsEnabled,
    setInAppAlertsEnabled,
  } = useMonitoring()

  const windowCount = lastPrediction?.window ?? 0
  const prediction = lastPrediction
    ? { label: lastPrediction.prediction === 1 ? 'Seizure Detected' : 'No Seizure', proba: lastPrediction.probability }
    : null

  useEffect(() => {
    if (!user) return
    setSettingsLoading(true)
    setSettingsError(null)
    getAccountSettings(user.id, user.email)
      .then((loaded) => {
        setSettings(loaded)
        setSettingsDirty(false)
      })
      .catch((err: any) => {
        setSettingsError(err?.message ?? 'Could not load account settings.')
      })
      .finally(() => setSettingsLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    getUserSessions(user.id).then(setPastSessions).catch(console.error)
  }, [user, connectionStatus])

  const handleConnect = async () => {
    if (isConnected) {
      await disconnectDevice()
      return
    }

    await connectDevice()
  }

  const handleStartMonitoring = async () => {
    await startMonitoring()
  }

  const handleStopMonitoring = async () => {
    await stopMonitoring()
  }

  const handleCheckSignalQuality = async () => {
    await checkSignalQuality()
  }

  const progress = Math.min((windowCount / 100) * 100, 100)
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60
  const emergencyContactTrimmed = settings.emergencyContact.trim()
  const emergencyContactInvalid =
    emergencyContactTrimmed.length > 0 && !EMAIL_REGEX.test(emergencyContactTrimmed)

  const onSettingChange = (patch: Partial<AccountSettings>) => {
    if (Object.prototype.hasOwnProperty.call(patch, 'emailAlerts')) {
      setEmailAlertsEnabled(Boolean(patch.emailAlerts))
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'inAppAlerts')) {
      setInAppAlertsEnabled(Boolean(patch.inAppAlerts))
    }
    setSettings((prev) => ({ ...prev, ...patch }))
    setSettingsDirty(true)
    setSettingsNotice(null)
  }

  const handleSaveSettings = async () => {
    if (!user) return

    if (emergencyContactInvalid) {
      setSettingsError('Emergency contact email format is invalid.')
      return
    }

    setSettingsSaving(true)
    setSettingsError(null)
    setSettingsNotice(null)

    try {
      await saveAccountSettings(user.id, user.email, settings)
      setSettingsDirty(false)
      setSettingsNotice('Settings saved to your cloud account.')
    } catch (err: any) {
      setSettingsError(err?.message ?? 'Failed to save settings.')
    } finally {
      setSettingsSaving(false)
    }
  }

  return (
    <div className="relative space-y-6">
      <div
        className="pointer-events-none absolute -left-24 -top-20 h-56 w-[min(100%,28rem)] rounded-full bg-violet-600/[0.12] blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-100 sm:text-[1.75rem]">
            EEG monitoring dashboard
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
            Real-time seizure detection signals with session-level epilepsy risk context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label="Open account settings"
            title="Account Settings"
          >
            <Settings size={18} />
          </Button>
          <StatusBadge status={connectionStatus} />
        </div>
      </div>

      <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] flex max-h-[min(90vh,640px)] w-[min(calc(100vw-1.5rem),440px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12101a] shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_40px_100px_-32px_rgba(0,0,0,0.85)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
              <div className="min-w-0">
                <Dialog.Title className="font-display text-lg font-semibold tracking-tight text-slate-100">
                  Account settings
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs leading-relaxed text-slate-500">
                  Profile, notifications, and session preferences. Changes sync to your account when you save.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {settingsLoading && (
                <p className="mb-4 text-xs text-slate-500">Loading saved settings…</p>
              )}

              {settingsError && (
                <div className="mb-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {settingsError}
                </div>
              )}

              {settingsNotice && (
                <div className="mb-4 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {settingsNotice}
                </div>
              )}

              <section className="mb-6">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Account</h3>
                <label className="mb-1 block text-xs font-medium text-slate-400">Signed in as</label>
                <Input type="text" value={user?.email ?? 'Unknown user'} disabled className="bg-white/[0.04] opacity-90" readOnly />
              </section>

              <section className="mb-6">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Emergency contact</h3>
                <label className="mb-1 block text-xs font-medium text-slate-400">Email (optional)</label>
                <Input
                  type="email"
                  placeholder="family@example.com"
                  value={settings.emergencyContact}
                  onChange={(e) => onSettingChange({ emergencyContact: e.target.value })}
                />
                {emergencyContactInvalid && (
                  <p className="mt-1.5 text-xs text-amber-400">Enter a valid email or leave blank.</p>
                )}
              </section>

              <section className="mb-6">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notifications</h3>
                <p className="mb-2 text-xs text-slate-600">Control how we reach you about monitoring.</p>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3">
                  <SettingsSwitchRow
                    id="set-email-alerts"
                    label="High-risk email alerts"
                    description="Email when a session ends with elevated epilepsy risk."
                    checked={settings.emailAlerts}
                    onCheckedChange={(v) => onSettingChange({ emailAlerts: v })}
                  />
                  <SettingsSwitchRow
                    id="set-inapp-alerts"
                    label="In-app alerts"
                    description="Banner alerts while monitoring is running."
                    checked={settings.inAppAlerts}
                    onCheckedChange={(v) => onSettingChange({ inAppAlerts: v })}
                  />
                  <SettingsSwitchRow
                    id="set-monthly"
                    label="Monthly summary"
                    description="Periodic email recap of monitoring activity."
                    checked={settings.monthlySummary}
                    onCheckedChange={(v) => onSettingChange({ monthlySummary: v })}
                  />
                </div>
              </section>

              <section className="mb-6">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Data</h3>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3">
                  <SettingsSwitchRow
                    id="set-share"
                    label="Share anonymized data"
                    description="Help improve models with de-identified usage patterns."
                    checked={settings.shareAnonymizedData}
                    onCheckedChange={(v) => onSettingChange({ shareAnonymizedData: v })}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Security</h3>
                <Button type="button" variant="outline" className="w-full justify-center" onClick={() => signOut()}>
                  Sign out on this device
                </Button>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  Password and account deletion are managed in your identity provider (Supabase Auth).
                </p>
              </section>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.08] bg-black/25 px-5 py-4">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsSaving || settingsLoading || !settingsDirty || emergencyContactInvalid}
              >
                {settingsSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {backendError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-3 text-sm text-red-400 flex items-center justify-between">
          <span>{backendError}</span>
          <button onClick={clearBackendError} className="text-red-400/60 hover:text-red-400 ml-4">&times;</button>
        </div>
      )}

      {completion && (
        <div className={`rounded-xl px-5 py-4 ${
          completion.final_prediction === 1
            ? 'bg-red-500/10 border border-red-500/20'
            : 'bg-emerald-500/10 border border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-3">
            {completion.final_prediction === 1 ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
            <div>
              <p className={`text-sm font-semibold ${completion.final_prediction === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                {completion.final_prediction === 1 ? 'Epilepsy Likely' : 'Epilepsy Unlikely'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {completion.total_windows} windows analyzed &middot;
                {completion.seizure_count} seizures detected &middot;
                Avg probability: {completion.avg_probability.toFixed(3)}
                {completion.seizure_count >= 2
                  ? ' - Multiple seizures detected, indicating high risk of developing epilepsy'
                  : ' - Few or no seizures detected, low risk of epilepsy'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card elevated className="lg:col-span-1 flex flex-col gap-4" glow={isConnected ? 'green' : 'none'}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isConnected ? '#34d399' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">EEG Device</p>
              <p className="text-xs text-slate-500">6 channels &middot; 256 Hz</p>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={connectionStatus === 'connecting'}
            variant={isConnected ? 'danger' : 'default'}
            className="w-full"
          >
            {connectionStatus === 'connecting' ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect Device'}
          </Button>

          {isConnected && (
            <Button
              onClick={isMonitoring || monitoringStatus === 'starting' ? handleStopMonitoring : handleStartMonitoring}
              disabled={monitoringStatus === 'starting' || (!isMonitoring && signalQualityState !== 'good')}
              variant={isMonitoring ? 'danger' : 'outline'}
              className="w-full"
            >
              {monitoringStatus === 'starting'
                ? 'Starting Monitoring...'
                : isMonitoring
                ? 'Stop Monitoring'
                : 'Start Monitoring'}
            </Button>
          )}

          {isConnected && monitoringStatus === 'idle' && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCheckSignalQuality}
                disabled={signalQualityState === 'checking'}
              >
                {signalQualityState === 'checking' ? 'Checking Signal Quality...' : 'Check Signal Quality'}
              </Button>

              <div className="rounded-lg border border-gray-800/70 bg-gray-900/40 px-3 py-2">
                <p className="text-xs text-slate-500">Signal quality status</p>
                <p className={`text-sm font-semibold mt-0.5 ${
                  signalQualityState === 'good'
                    ? 'text-emerald-400'
                    : signalQualityState === 'poor'
                    ? 'text-amber-400'
                    : signalQualityState === 'checking'
                    ? 'text-fuchsia-400'
                    : 'text-slate-300'
                }`}>
                  {signalQualityState === 'good'
                    ? 'Good'
                    : signalQualityState === 'poor'
                    ? 'Poor'
                    : signalQualityState === 'checking'
                    ? 'Checking...'
                    : 'Unchecked'}
                  {signalQualityScore !== null ? ` (${signalQualityScore.toFixed(1)} / 100)` : ''}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {signalQualityMessage ?? 'Run quality check before monitoring.'}
                </p>
              </div>
            </div>
          )}

          {(isMonitoring || monitoringStatus === 'starting') && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Session progress</span>
                  <span className="text-slate-400 font-mono">{windowCount}/100 windows</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 via-fuchsia-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Elapsed</span>
                <span className="text-slate-300 font-mono">{minutes}:{seconds.toString().padStart(2, '0')}</span>
              </div>
            </div>
          )}
        </Card>

        <Card elevated className="lg:col-span-2" glow={prediction ? (prediction.proba > 0.5 ? 'red' : 'green') : 'none'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Prediction</h2>
            {prediction && (
              <span className="text-xs text-slate-500 font-mono">Window {windowCount} of 100</span>
            )}
          </div>

          {prediction ? (
            <div className="flex items-center gap-6">
              <div className={`h-20 w-20 rounded-2xl flex items-center justify-center ${prediction.proba > 0.5 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                {prediction.proba > 0.5 ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-3xl font-bold ${prediction.proba > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {prediction.proba > 0.5 ? 'Seizure Detected' : 'No Seizure'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Confidence: <span className="font-mono text-slate-300">{(prediction.proba * 100).toFixed(1)}%</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Probability</p>
                <p className="text-xl font-mono font-bold text-slate-300">{prediction.proba.toFixed(3)}</p>
              </div>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center text-slate-600 text-sm">
              {!isConnected
                ? 'Connect a device to prepare monitoring'
                : monitoringStatus === 'idle'
                ? 'Device connected. Press Start Monitoring to begin detection.'
                : 'Preparing live monitoring...'}
            </div>
          )}
        </Card>
      </div>

      {isMonitoring && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Windows" value={windowCount} unit="/ 100" accent="violet" />
          <MetricCard label="Sampling Rate" value="256" unit="Hz" accent="green" />
          <MetricCard label="Channels" value="6" unit="active" accent="purple" />
          <MetricCard label="Probability" value={prediction ? prediction.proba.toFixed(3) : '--'} accent={prediction && prediction.proba > 0.5 ? 'red' : 'green'} />
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Live EEG Signal</h2>
            <p className="text-xs text-slate-500 mt-0.5">6-channel recording &middot; 6-second windows</p>
          </div>
          <Link to="/data" className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
            View Analysis &rarr;
          </Link>
        </div>
        <div className="p-3">
          <EEGWaveform
            channels={6}
            height={340}
            speed={isMonitoring ? 2 : 0.5}
            paused={!isMonitoring}
            streamedWindow={lastWindowData}
          />
        </div>
      </Card>

      {pastSessions.length > 0 && (
        <Card elevated>
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Recent Sessions</h2>
          <div className="space-y-2">
            {pastSessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-bg border border-gray-800/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    s.status === 'completed' ? (s.final_prediction === 1 ? 'bg-red-400' : 'bg-emerald-400') : 'bg-slate-500'
                  }`} />
                  <div>
                    <p className="text-sm text-slate-300">
                      {new Date(s.started_at).toLocaleDateString()} &middot; {new Date(s.started_at).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.total_windows} windows &middot; {s.status}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {s.status === 'completed' && (
                    <>
                      <p className={`text-sm font-semibold ${s.final_prediction === 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {s.final_prediction === 1 ? 'Epilepsy Likely' : 'Epilepsy Unlikely'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{s.avg_probability?.toFixed(3)}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
