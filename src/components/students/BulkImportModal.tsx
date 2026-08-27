import { useState } from 'react';
import { API_URL } from '../../config';

interface BulkImportModalProps {
  onImported: () => void;
  onClose: () => void;
}

interface ParsedRow {
  name: string;
  class: string;
  section?: string;
  parent_phone: string;
  parent_name?: string;
  birthday: string;
  gender?: string;
  address?: string;
  blood_group?: string;
  roll_no?: string;
  admission_date?: string;
}

function convertDOBtoBirthday(dob: string): string {
  // Handles DD-MM-YYYY format from the school's export
  const parts = dob.split('-');
  if (parts.length === 3) {
    const [day, month] = parts;
    return `${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dob;
}

export default function BulkImportModal({ onImported, onClose }: BulkImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [importing, setImporting] = useState(false);

  const parseCSVLine = (line: string): string[] => {
    // Basic CSV parser that handles quoted fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setWarning('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split('\n');
        const headers = parseCSVLine(lines[0]).map((h) => h.trim());

        const requiredCols = ['Name', 'Class', 'Phone Number', 'Data of Birth'];
        const missing = requiredCols.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          setError(`Missing required columns: ${missing.join(', ')}`);
          return;
        }

        const idx = (col: string) => headers.indexOf(col);
        let maskedPhoneCount = 0;

        const parsed: ParsedRow[] = lines.slice(1).map((line) => {
          const values = parseCSVLine(line);
          const phone = values[idx('Phone Number')] || '';
          if (phone.includes('X') || phone.includes('x')) maskedPhoneCount++;

          return {
            name: (values[idx('Name')] || '').trim(),
            class: (values[idx('Class')] || '').trim(),
            section: idx('Section') >= 0 ? values[idx('Section')] : undefined,
            parent_phone: phone.replace(/[^0-9]/g, ''),
            parent_name: idx('Father Name') >= 0 && values[idx('Father Name')]
              ? values[idx('Father Name')]
              : (idx('Mother Name') >= 0 ? values[idx('Mother Name')] : undefined),
            birthday: convertDOBtoBirthday(values[idx('Data of Birth')] || ''),
            gender: idx('Gender') >= 0 ? values[idx('Gender')] : undefined,
            address: idx('Address') >= 0 ? values[idx('Address')] : undefined,
            blood_group: idx('Blood Group') >= 0 ? values[idx('Blood Group')] : undefined,
            roll_no: idx('Admission Number') >= 0 ? values[idx('Admission Number')] : undefined,
            admission_date: idx('Data of joining') >= 0 ? values[idx('Data of joining')] : undefined,
          };
        }).filter((r) => r.name);

        if (maskedPhoneCount > 0) {
          setWarning(`⚠️ ${maskedPhoneCount} phone number(s) appear masked (contain X's) and won't work for WhatsApp. Please use an unmasked export.`);
        }

        setRows(parsed);
      } catch (err) {
        setError('Could not parse the file. Make sure it is a valid CSV export.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`${API_URL}/api/students/bulk-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: rows }),
      });
      const data = await res.json();
      if (data.success) {
        onImported();
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      setError('Import failed — please try again');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800">Bulk Import Students</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Upload the school's exported CSV (save the Excel file as CSV first). Expected columns include:
          <br />
          <code className="bg-slate-100 px-1 rounded text-[10px]">Name, Class, Section, Father Name, Phone Number, Data of Birth, Gender, Address, Blood Group</code>
        </p>

        <label className="border border-dashed border-slate-300 rounded-lg p-4 text-center block cursor-pointer hover:bg-slate-50 mb-3">
          <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <span className="text-sm text-slate-500">📄 Click to select CSV file</span>
        </label>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {warning && <p className="text-sm text-amber-600 mb-3 bg-amber-50 p-2 rounded-lg">{warning}</p>}

        {rows.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-600 mb-2">{rows.length} students found — preview:</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto text-xs">
              {rows.slice(0, 5).map((r, i) => (
                <p key={i} className="text-slate-600">{r.name} — {r.class}{r.section ? `-${r.section}` : ''} — {r.parent_phone}</p>
              ))}
              {rows.length > 5 && <p className="text-slate-400">+ {rows.length - 5} more</p>}
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${rows.length} Students`}
            </button>
          </>
        )}

        <button onClick={onClose} className="w-full mt-3 text-xs text-slate-500 hover:underline">
          Close
        </button>
      </div>
    </div>
  );
}