import { useMonitoring } from '../lib/monitoring'

export default function InAppAlerts() {
  const { alerts, dismissAlert, inAppAlertsEnabled } = useMonitoring()

  if (!inAppAlertsEnabled || alerts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] space-y-3 w-[min(360px,calc(100vw-2rem))]">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-lg shadow-red-900/20 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-300">Seizure detected</p>
              <p className="text-xs text-slate-300 mt-1">
                Window {alert.window} flagged with probability {(alert.probability * 100).toFixed(1)}%.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissAlert(alert.id)}
              className="text-red-200/70 hover:text-red-200 leading-none"
              aria-label="Dismiss alert"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
