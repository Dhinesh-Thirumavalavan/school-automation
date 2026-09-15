import { useEffect, useState } from 'react';
import { parentApi } from '../api';
import type { ExamItem, ParentStudent } from '../types';
import { Card, EmptyState, SkeletonCard } from '../ui';
import { FlagIcon } from '../icons';

interface ExamsDetailProps {
  student: ParentStudent;
}

export default function ExamsDetail({ student }: ExamsDetailProps) {
  const [exams, setExams] = useState<ExamItem[] | null>(null);

  useEffect(() => {
    parentApi.exams(student.class).then(setExams).catch(() => setExams([]));
  }, [student.class]);

  const upcoming = (exams || []).filter((e) => new Date(e.exam_date) >= new Date(new Date().toDateString()));

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-lg font-bold text-slate-900">Exams — Class {student.class}</h1>
      {exams === null ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={<FlagIcon className="w-5 h-5" />} title="No upcoming exams" />
      ) : (
        <div className="space-y-3">
          {upcoming.map((exam) => {
            const date = new Date(exam.exam_date);
            return (
              <Card key={exam.id} className="p-4 flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-semibold uppercase">{date.toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="text-sm font-bold">{date.getDate()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{exam.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {exam.exam_time && `${exam.exam_time} · `}{exam.term}
                  </p>
                  {exam.portion && <p className="text-xs text-slate-500 mt-1">{exam.portion}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
