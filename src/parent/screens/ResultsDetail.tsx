import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { ParentStudent, ResultItem } from '../types';
import { Card, EmptyState, SkeletonCard } from '../ui';
import { ResultsIcon } from '../icons';

interface ResultsDetailProps {
  student: ParentStudent;
}

export default function ResultsDetail({ student }: ResultsDetailProps) {
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  useEffect(() => {
    parentApi.results(student.id).then((data) => {
      setResults(data);
      if (data[0]) setSelectedTerm(data[0].term);
    }).catch(() => setResults([]));
  }, [student.id]);

  if (results === null) {
    return (
      <div className="p-4 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon={<ResultsIcon className="w-5 h-5" />} title="No results published yet" />
      </div>
    );
  }

  const terms = [...new Set(results.map((r) => r.term))];
  const termResults = results.filter((r) => r.term === selectedTerm);
  const totalMarks = termResults.reduce((sum, r) => sum + Number(r.marks), 0);
  const totalMax = termResults.reduce((sum, r) => sum + Number(r.max_marks), 0);
  const overallPct = totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      {terms.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {terms.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTerm(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                selectedTerm === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="bg-emerald-600 text-white rounded-2xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">{selectedTerm}</p>
        <p className="text-3xl font-extrabold mt-1">{overallPct}%</p>
        <p className="text-xs text-emerald-100 mt-0.5">{totalMarks} / {totalMax} overall</p>
      </div>

      <div className="space-y-2">
        {termResults.map((r) => (
          <Card key={r.id} className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">{r.subject}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{r.marks}/{r.max_marks}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{r.grade || '—'}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
