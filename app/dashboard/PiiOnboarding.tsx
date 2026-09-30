'use client';

import { useState } from 'react';
import { setPiiAcknowledged } from '@/lib/dashboard/piiAck';

interface PiiOnboardingProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const CHECKS = [
  'My data does not contain patient names',
  'My data does not contain NHS numbers',
  'My data does not contain dates of birth',
  'My data does not contain any other information that could identify an individual patient',
] as const;

const EXAMPLES = [
  { label: 'Patient names', examples: 'First name, last name, initials combined with other data, or any column labelled "patient", "name", "surname"' },
  { label: 'NHS numbers', examples: '10-digit numbers used to identify patients in NHS systems (e.g. 943 476 5919)' },
  { label: 'Dates of birth', examples: 'Any column containing birth dates, age with date, or columns labelled "DOB", "born", "date of birth"' },
  { label: 'National Insurance numbers', examples: 'Two letters, six digits, one letter (e.g. AB123456C)' },
  { label: 'Postcodes linked to individuals', examples: 'Patient home postcodes (aggregate area-level postcodes for mapping are usually fine)' },
  { label: 'Contact details', examples: 'Email addresses, phone numbers, home addresses' },
  { label: 'Free-text clinical notes', examples: 'Any column containing narrative text that might name or describe individual patients' },
];

export default function PiiOnboarding({ onConfirm, onCancel }: PiiOnboardingProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState(false);

  const allChecked = CHECKS.every((c) => checked[c]);

  const toggle = (label: string) =>
    setChecked((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleConfirm = () => {
    setPiiAcknowledged();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 rounded-t-2xl" />
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-amber-600">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Before you upload data</h2>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                This tool is for <strong>aggregate and anonymised data only</strong>. Do not upload data that identifies
                individual patients — including names, NHS numbers, dates of birth, or postcodes linked to individuals.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Checklist */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Please confirm all of the following:
            </p>
            <div className="space-y-3">
              {CHECKS.map((label) => (
                <label key={label} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checked[label]}
                    onChange={() => toggle(label)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 cursor-pointer"
                  />
                  <span className={`text-sm leading-relaxed transition-colors ${
                    checked[label] ? 'text-gray-700' : 'text-gray-900'
                  }`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Expandable section */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">
                What counts as identifiable data?
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {expanded && (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3 bg-gray-50">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Data is identifiable if it could — alone or combined with other information — reveal who a specific
                  patient is. The following are always considered identifiable:
                </p>
                {EXAMPLES.map((ex) => (
                  <div key={ex.label}>
                    <p className="text-xs font-semibold text-gray-700">{ex.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{ex.examples}</p>
                  </div>
                ))}
                <p className="text-xs text-gray-500 leading-relaxed pt-1 border-t border-gray-200">
                  <strong>Aggregate data is fine.</strong> Counts, rates, averages, and totals that describe groups
                  rather than individuals are what this tool is designed for.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allChecked}
            onClick={handleConfirm}
            className="flex-1 text-sm py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            I understand — continue to upload
          </button>
        </div>
      </div>
    </div>
  );
}
