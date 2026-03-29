import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui'
import { Button } from '../../components/ui'
import { Settings } from 'lucide-react'
import EEGWaveform from '../../components/EEGWaveform'
import StatusBadge from '../../components/StatusBadge'
import MetricCard from '../../components/MetricCard'
import { useAuth } from '../../lib/auth'
import { useMonitoring } from '../../lib/monitoring'
import { getUserSessions, type SessionRecord } from '../../lib/sessions'
import { defaultAccountSettings, getAccountSettings, saveAccountSettings, type AccountSettings } from '../../lib/accountSettings'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function HomeWeb() {
  const { user, signOut } = useAuth()
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>([])
  const [monitoringStartedAtMs, setMonitoringStartedAtMs] = useState<number | null>(null)
  const [displayElapsed, setDisplayElapsed] = useState(0)
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
    completion,
    isConnected,
    isMonitoring,
    connectDevice,
    disconnectDevice,
    startMonitoring,
    stopMonitoring,
    checkSignalQuality,
    clearBackendError,
  } = useMonitoring()

  const windowCount = lastPrediction?.window ?? 0
  const prediction = lastPrediction
    ? { label: lastPrediction.prediction === 1 ? 'Seizure Detected' : 'No Seizure', proba: lastPrediction.probability }
    : null

  useEffect(() => {
    if (monitoringStatus === 'starting') {
      setMonitoringStartedAtMs(Date.now())
      setDisplayElapsed(0)
    }
  }, [monitoringStatus])

  useEffect(() => {
    if ((monitoringStatus !== 'starting' && monitoringStatus !== 'running') || monitoringStartedAtMs === null) {
      return
    }

    const tick = () => {
      setDisplayElapsed(Math.floor((Date.now() - monitoringStartedAtMs) / 1000))
    }

    tick()
    const timerId = window.setInterval(tick, 1000)
    return () => window.clearInterval(timerId)
  }, [monitoringStatus, monitoringStartedAtMs])

  useEffect(() => {
    if (lastPrediction && (monitoringStatus === 'starting' || monitoringStatus === 'running')) {
      // Keep UI timer from drifting behind backend-reported elapsed seconds.
      setDisplayElapsed((prev) => Math.max(prev, lastPrediction.elapsed_seconds))
    }
  }, [lastPrediction, monitoringStatus])

  useEffect(() => {
    if (monitoringStatus !== 'idle') return

    setMonitoringStartedAtMs(null)
    if (completion?.total_windows) {
      setDisplayElapsed(completion.total_windows * 6)
      return
    }

    if (lastPrediction) {
      setDisplayElapsed(lastPrediction.elapsed_seconds)
      return
    }

    setDisplayElapsed(0)
  }, [monitoringStatus, completion, lastPrediction])

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
  const minutes = Math.floor(displayElapsed / 60)
  const seconds = displayElapsed % 60
  const emergencyContactTrimmed = settings.emergencyContact.trim()
  const emergencyContactInvalid =
    emergencyContactTrimmed.length > 0 && !EMAIL_REGEX.test(emergencyContactTrimmed)

  const onSettingChange = (patch: Partial<AccountSettings>) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">EEG Monitoring Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Epilepsy prediction based on real-time seizure detection</p>
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

      {settingsOpen && (
        <Card className="space-y-4" glow="cyan">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Account Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-slate-500 hover:text-slate-300 text-sm"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-slate-400">Signed-in Account</span>
              <input
                type="text"
                value={user?.email ?? 'Unknown user'}
                disabled
                className="w-full rounded-lg border border-gray-700 bg-gray-800/40 px-3 py-2 text-slate-300"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-slate-400">Emergency Contact Email (optional)</span>
              <input
                type="email"
                placeholder="family@example.com"
                value={settings.emergencyContact}
                onChange={(e) => onSettingChange({ emergencyContact: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-slate-100"
              />
              {emergencyContactInvalid && (
                <p className="text-xs text-amber-400">Please enter a valid email address.</p>
              )}
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={(e) => onSettingChange({ emailAlerts: e.target.checked })}
                />
                Email alerts for high-risk session outcomes
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.inAppAlerts}
                  onChange={(e) => onSettingChange({ inAppAlerts: e.target.checked })}
                />
                In-app alerts during live monitoring
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.monthlySummary}
                  onChange={(e) => onSettingChange({ monthlySummary: e.target.checked })}
                />
                Monthly monitoring summary by email
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.shareAnonymizedData}
                  onChange={(e) => onSettingChange({ shareAnonymizedData: e.target.checked })}
                />
                Share anonymized data for model improvement
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-slate-400">Security</p>
              <Button type="button" variant="outline" className="w-full" onClick={() => signOut()}>
                Sign Out On This Device
              </Button>
              <p className="text-xs text-slate-500">
                Password updates and account deletion are managed in Supabase Auth settings.
              </p>
            </div>
          </div>

          {settingsLoading && (
            <p className="text-xs text-slate-500">Loading saved settings...</p>
          )}

          {settingsError && (
            <p className="text-xs text-red-400">{settingsError}</p>
          )}

          {settingsNotice && (
            <p className="text-xs text-emerald-400">{settingsNotice}</p>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSaveSettings}
              disabled={settingsSaving || settingsLoading || !settingsDirty || emergencyContactInvalid}
            >
              {settingsSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>

          <p className="text-xs text-slate-500">
            These settings are stored in your cloud account profile.
          </p>
        </Card>
      )}

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
        <Card className="lg:col-span-1 flex flex-col gap-4" glow={isConnected ? 'green' : 'none'}>
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
                    ? 'text-cyan-400'
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
                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
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

        <Card className="lg:col-span-2" glow={prediction ? (prediction.proba > 0.5 ? 'red' : 'green') : 'none'}>
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
          <MetricCard label="Windows" value={windowCount} unit="/ 100" accent="cyan" />
          <MetricCard label="Sampling Rate" value="256" unit="Hz" accent="green" />
          <MetricCard label="Channels" value="6" unit="active" accent="purple" />
          <MetricCard label="Probability" value={prediction ? prediction.proba.toFixed(3) : '--'} accent={prediction && prediction.proba > 0.5 ? 'red' : 'green'} />
        </div>
      )}

      <Card className="p-0 overflow-hidden">
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
          <EEGWaveform channels={6} height={340} speed={isMonitoring ? 2 : 0.5} paused={!isMonitoring} />
        </div>
      </Card>

      {pastSessions.length > 0 && (
        <Card>
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
