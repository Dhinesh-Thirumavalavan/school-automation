import { useState } from 'react';

export interface ExamFormValues {
  class: string;
  subject: string;
  exam_date: string;
  exam_time: string;
  portion: string;
  term: string;
}

interface ExamFormModalProps {
  initial?: ExamFormValues;
  classOptions?: string[];
  onSave: (values: ExamFormValues) => void;
  onClose: () => void;
}

const defaultClassOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

export default function ExamFormModal({ initial, classOptions, onSave, onClose }: ExamFormModalProps) {
  const options = classOptions && classOptions.length > 0 ? classOptions : defaultClassOptions;
  const [examClass, setExamClass] = useState(initial?.class ?? options[0]);
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [examDate, setExamDate] = useState(initial?.exam_date ?? '');
  const [examTime, setExamTime] = useState(initial?.exam_time ?? '');
  const [portion, setPortion] = useState(initial?.portion ?? '');
  const [term, setTerm] = useState(initial?.term ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ class: examClass, subject, exam_date: examDate, exam_time: examTime, portion, term });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{initial ? 'Edit Exam' : 'Schedule Exam'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={examClass}
                onChange={(e) => setExamClass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {options.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Term</label>
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. Term 2"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <input
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                placeholder="9:00 - 11:00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Portion / Syllabus</label>
            <textarea
              value={portion}
              onChange={(e) => setPortion(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 text-sm font-medium py-2 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
