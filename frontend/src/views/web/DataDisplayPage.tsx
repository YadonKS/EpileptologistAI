import React, { useState } from "react";
import { Button, Card } from "../../components/ui";

export default function DataDisplayPage() {
  const [tab, setTab] = useState<"signals" | "metrics" | "diagnosis">("signals");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top gradient header (matches app aesthetic) */}
      <div className="w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-slate-900">
            EEG Data Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            View EEG signals, summary metrics, and diagnosis placeholders.
          </p>

          {/* Tabs */}
          <div className="mt-6 flex gap-3">
            <Button
              variant={tab === "signals" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("signals")}
            >
              Signals
            </Button>

            <Button
              variant={tab === "metrics" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("metrics")}
            >
              Metrics
            </Button>

            <Button
              variant={tab === "diagnosis" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("diagnosis")}
            >
              Diagnosis
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* SIGNALS */}
        {tab === "signals" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                Raw EEG Signal
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Placeholder for time-series EEG waveform.
              </p>
              <div className="mt-4 h-48 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                Raw signal chart placeholder
              </div>
            </Card>

            <Card className="p-5 rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                Filtered Signal
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Placeholder for band-pass or artifact-filtered signal.
              </p>
              <div className="mt-4 h-48 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                Filtered signal chart placeholder
              </div>
            </Card>
          </div>
        )}

        {/* METRICS */}
        {tab === "metrics" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur text-center">
              <h2 className="text-sm font-semibold text-slate-900">
                Alpha Waves
              </h2>
              <p className="mt-3 text-4xl font-bold text-sky-600">--</p>
              <p className="text-xs text-slate-500 mt-1">Hz (placeholder)</p>
            </Card>

            <Card className="p-5 rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur text-center">
              <h2 className="text-sm font-semibold text-slate-900">
                Beta Waves
              </h2>
              <p className="mt-3 text-4xl font-bold text-sky-600">--</p>
              <p className="text-xs text-slate-500 mt-1">Hz (placeholder)</p>
            </Card>

            <Card className="p-5 rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur text-center">
              <h2 className="text-sm font-semibold text-slate-900">
                Gamma Waves
              </h2>
              <p className="mt-3 text-4xl font-bold text-sky-600">--</p>
              <p className="text-xs text-slate-500 mt-1">Hz (placeholder)</p>
            </Card>
          </div>
        )}

        {/* DIAGNOSIS */}
        {tab === "diagnosis" && (
          <Card className="p-6 rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">
              Diagnosis Summary
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              No diagnosis available yet. When EEG processing is implemented,
              this section will display insights, anomaly flags, and
              risk/diagnostic summaries for each session.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}