import { useEffect, useState } from 'react';
import { API_URL } from '../../config';
import ExamFormModal, { type ExamFormValues } from './ExamFormModal';

interface Exam {
  id: string;
  class: string;
  subject: string;
  exam_date: string;
  exam_day: string | null;
  exam_time: string | null;
  portion: string | null;
  term: string | null;
}

const classOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function ExamSchedule() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const load = () => {
    setLoading(true);
    const url = classFilter ? `${API_URL}/api/exams?class=${classFilter}` : `${API_URL}/api/exams`;
    fetch(url)
      .then((r) => r.json())
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [classFilter]);

  const handleSave = async (values: ExamFormValues) => {
    const exam_day = values.exam_date
      ? new Date(values.exam_date).toLocaleDateString('en-IN', { weekday: 'short' })
      : null;
    const payload = { ...values, exam_day };
    const url = editingExam ? `${API_URL}/api/exams/${editingExam.id}` : `${API_URL}/api/exams`;
    const method = editingExam ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setShowForm(false);
    setEditingExam(null);
    load();
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Delete the ${exam.subject} exam for Class ${exam.class}?`)) return;
    await fetch(`${API_URL}/api/exams/${exam.id}`, { method: 'DELETE' });
    load();
  };

  const upcoming = exams.filter((e) => new Date(e.exam_date) >= new Date(new Date().toDateString()));
  const past = exams.filter((e) => new Date(e.exam_date) < new Date(new Date().toDateString()));

  const renderExam = (exam: Exam) => (
    <div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">{exam.subject} · Class {exam.class}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date(exam.exam_date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
            {exam.exam_time && ` · ${exam.exam_time}`}{exam.term && ` · ${exam.term}`}
          </p>
          {exam.portion && <p className="text-xs text-slate-500 mt-1">{exam.portion}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { setEditingExam(exam); setShowForm(true); }}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Edit
          </button>
          <button onClick={() => handleDelete(exam)} className="text-xs text-red-500 hover:text-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Exam Schedule</h2>
        <button
          onClick={() => { setEditingExam(null); setShowForm(true); }}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700"
        >
          + Schedule Exam
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setClassFilter('')}
          className={`text-xs px-3 py-1.5 rounded-full border ${!classFilter ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600'}`}
        >
          All Classes
        </button>
        {classOptions.map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-full border ${classFilter === c ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : exams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
          No exams scheduled{classFilter ? ` for Class ${classFilter}` : ''}.
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-2">{upcoming.map(renderExam)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Past</p>
              <div className="space-y-2 opacity-60">{past.map(renderExam)}</div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <ExamFormModal
          initial={editingExam ? {
            class: editingExam.class,
            subject: editingExam.subject,
            exam_date: editingExam.exam_date,
            exam_time: editingExam.exam_time || '',
            portion: editingExam.portion || '',
            term: editingExam.term || '',
          } : undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingExam(null); }}
        />
      )}
    </div>
  );
}
