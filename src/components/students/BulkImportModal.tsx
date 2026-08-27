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
}

export default function BulkImportModal({ onImported, onClose }: BulkImportModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

        const requiredCols = ['name', 'class', 'parent_phone', 'birthday'];
        const missing = requiredCols.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          setError(`Missing required columns: ${missing.join(', ')}`);
          return;
        }

        const parsed: ParsedRow[] = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim());
          const row: any = {};
          headers.forEach((h, i) => (row[h] = values[i] || ''));
          return row;
        }).filter((r) => r.name);

        setRows(parsed);
      } catch (err) {
        setError('Could not parse the file. Make sure it is a valid CSV.');
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
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Bulk Import Students</h3>
        <p className="text-xs text-slate-500 mb-4">
          Upload a CSV with columns: <code className="bg-slate-100 px-1 rounded">name, class, section, parent_phone, parent_name, birthday</code>
          <br />
          (birthday format: MM-DD, e.g. 08-20)
        </p>

        <label className="border border-dashed border-slate-300 rounded-lg p-4 text-center block cursor-pointer hover:bg-slate-50 mb-3">
          <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <span className="text-sm text-slate-500">📄 Click to select CSV file</span>
        </label>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {rows.length > 0 && (
          <>
            <p className="text-xs font-medium text-slate-600 mb-2">{rows.length} students found — preview:</p>
            <div className="bg-slate-50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto text-xs">
              {rows.slice(0, 5).map((r, i) => (
                <p key={i} className="text-slate-600">{r.name} — {r.class} — {r.parent_phone}</p>
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