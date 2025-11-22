import React from "react";
import { Link } from "react-router-dom";

export default function HomeWeb() {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);

  const handleConnectClick = () => {
    if (isConnected) {
      // disconnect
      setIsConnected(false);
      setIsConnecting(false);
      return;
    }

    // connect delay
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
    }, 5000);
  };

  const buttonClasses =
    "rounded-full px-5 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-70 " +
    (isConnected
      ? "bg-emerald-400 hover:bg-emerald-300"
      : "bg-sky-500 hover:bg-sky-400");

  return (
    <div className="space-y-6 py-8">
      <section className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-50 px-6 py-5 shadow-sm">
        <h2 className="text-lg font-semibold">What this page does</h2>
        <p className="mt-2 text-sm text-slate-100">
          This home page is the starting point for connecting an EEG device and
          starting a monitoring session.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-200">
          <li>Connect and disconnect an EEG device.</li>
          <li>See a clear connection status message (green when connected).</li>
          <li>Navigate to login, mobile, examples, and about pages.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-50 px-6 py-5 shadow-sm">
        <h2 className="text-lg font-semibold">Connect EEG device</h2>
        <p className="mt-2 text-sm text-slate-100">
          Connect to the EEG headset and start a new monitoring session.
        </p>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm">
          <p className="font-medium">
            Status:{" "}
            <span
              className={
                isConnected
                  ? "text-emerald-400"
                  : isConnecting
                  ? "text-sky-400"
                  : "text-slate-300"
              }
            >
              {isConnected
                ? "Connected"
                : isConnecting
                ? "Connecting..."
                : "Not connected"}
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            This connection is simulated for now. Later your team can link it to
            the real EEG device and backend.
          </p>
        </div>

        {/* Connect / Disconnect button */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={handleConnectClick}
            disabled={isConnecting}
            className={buttonClasses}
          >
            {isConnected
              ? "Disconnect device"
              : isConnecting
              ? "Connecting..."
              : "Connect EEG device"}
          </button>

          <p className="text-xs text-slate-300">
            After connection you can open the data view page to see graphs and
            analysis.
          </p>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-200">
          <li>Check that the device is powered on.</li>
          <li>Make sure all electrodes are placed correctly.</li>
          <li>Stay still while recording for cleaner signals.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-900 text-slate-50 px-6 py-5 shadow-sm">
        <h2 className="text-lg font-semibold">Results</h2>
        <p className="mt-2 text-xs text-slate-300">
          You can view your previous EEG session alongside the new one you just recorded.
        </p>

        <div className="mt-3 space-y-2 text-xs text-slate-50">
          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            <span>Previous session </span>
            <Link to="/examples" className="text-sky-400 hover:underline"> View result </Link>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-3 py-2">
            <span>Current session </span>
            <Link to="/examples" className="text-sky-400 hover:underline"> View result </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
