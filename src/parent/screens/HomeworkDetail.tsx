import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { HomeworkItem, ParentStudent } from '../types';
import { Card, EmptyState, SkeletonCard } from '../ui';
import { BookIcon } from '../icons';

interface HomeworkDetailProps {
  student: ParentStudent;
}

export default function HomeworkDetail({ student }: HomeworkDetailProps) {
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentApi.homework(student.class).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  }, [student.class]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-900">Homework — Class {student.class}</h1>
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<BookIcon className="w-5 h-5" />} title="No homework posted yet" />
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <Card key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-500">
                  {new Date(h.posted_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{h.english_text}</p>
              {h.tamil_text && <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{h.tamil_text}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
