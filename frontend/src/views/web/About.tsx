import React from "react";

export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 text-slate-50">
      <h2 className="text-2xl font-semibold">About EpileptologistAI</h2>
      <p className="mt-3 text-sm text-slate-900">
        EpileptologistAI is a capstone project that explores how EEG data can be
        visualized and monitored through a modern web interface. It is not a
        medical device and is for educational purposes only.
      </p>
      <p className="mt-3 text-sm text-slate-900">
        This dashboard allows users to connect an EEG device, view sessions, and
        experiment with basic analysis and visualizations.Moreover,it shows the previous data of patients.
      </p>
    </div>
  );
}
