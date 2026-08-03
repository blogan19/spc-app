import type { Dataset } from './types';

export interface PiiFlag {
  column: string;
  reason: string;
}

const NAME_HEADERS = ['firstname', 'lastname', 'surname', 'forename', 'patient name', 'full name', 'family name'];
const DOB_HEADERS = ['dob', 'date of birth', 'birth date', 'birthdate', 'born'];
const NHS_HEADERS = ['nhs number', 'nhs no', 'nhsnumber', 'nhs_number', 'nhs_no'];

const NHS_NUMBER_RE = /^\d{10}$/;
const NI_NUMBER_RE = /^[A-Z]{2}\d{6}[A-D]$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sampleValues(dataset: Dataset, column: string): string[] {
  return dataset.rows
    .slice(0, 100)
    .map((r) => String(r[column] ?? '').trim())
    .filter(Boolean);
}

export function detectPii(dataset: Dataset): PiiFlag[] {
  const flags: PiiFlag[] = [];

  for (const col of dataset.columns) {
    const lower = col.name.toLowerCase();

    if (NAME_HEADERS.some((p) => lower.includes(p))) {
      flags.push({ column: col.name, reason: 'Column name suggests patient or person name data' });
      continue;
    }
    if (DOB_HEADERS.some((p) => lower.includes(p))) {
      flags.push({ column: col.name, reason: 'Column name suggests date of birth data' });
      continue;
    }
    if (NHS_HEADERS.some((p) => lower.includes(p))) {
      flags.push({ column: col.name, reason: 'Column name suggests NHS number data' });
      continue;
    }

    const values = sampleValues(dataset, col.name);
    if (values.some((v) => NHS_NUMBER_RE.test(v.replace(/\s/g, '')))) {
      flags.push({ column: col.name, reason: 'Values match NHS number format (10-digit number)' });
      continue;
    }
    if (values.some((v) => NI_NUMBER_RE.test(v.replace(/\s/g, '')))) {
      flags.push({ column: col.name, reason: 'Values match National Insurance number format' });
      continue;
    }
    if (values.some((v) => EMAIL_RE.test(v))) {
      flags.push({ column: col.name, reason: 'Column contains email addresses' });
      continue;
    }
  }

  return flags;
}
