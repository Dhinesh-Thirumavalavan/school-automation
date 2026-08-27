import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import TeacherCompose from './TeacherCompose';

interface Student {
  id: string;
  name: string;
  class: string;
  parent_phone: string;
}

interface AttendanceRecord {
  student_id: string;
  status: string;
}

interface HomeworkItem {
  id: string;
  class: string;
  english_text: string;
  tamil_text: string;
  posted_at: string;
}

interface TeacherDashboardProps {
  assignedClasses: string[];
}

export default function TeacherDashboard({ assignedClasses }: TeacherDashboardProps) {
  const [activeClass, setActiveClass] = useState(assignedClasses[0] || '');
  const [activeTab, setActiveTab] = useState<'attendance' | 'homework' | 'compose'>('attendance');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState<string | null>(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [postingHomework, setPostingHomework] = useState(false);
  const [homeworkPosted, setHomeworkPosted] = useState(false);
  const [homeworkHistory, setHomeworkHistory] = useState<HomeworkItem[]>([]);
  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    const studentsRes = await fetch(`${API_URL}/api/students`);
    const allStudents = await studentsRes.json();
    const classStudents = allStudents.filter((s: any) => s.class === activeClass);
    setStudents(classStudents.map((s: any) => ({ id: s.id, name: s.name, class: s.class, parent_phone: s.parent_phone })));

    const attRes = await fetch(`${API_URL}/api/attendance?date=${today}&class=${activeClass}`);
    const attData: AttendanceRecord[] = await attRes.json();
    const attMap: Record<string, string> = {};
    attData.forEach((a: any) => (attMap[a.student_id] = a.status));
    setAttendance(attMap);

    const hwRes = await fetch(`${API_URL}/api/homework?class=${activeClass}`);
    const hwData = await hwRes.json();
    setHomeworkHistory(hwData);
  };

  useEffect(() => {
    if (activeClass) fetchData();
  }, [activeClass]);

  const markStudent = async (studentId: string, status: 'present' | 'absent') => {
    setMarking(studentId);
    try {
      await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, status, date: today }),
      });
      setAttendance((prev) => ({ ...prev, [studentId]: status }));
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(null);
    }
  };

  const postHomework = async () => {
    if (!homeworkText.trim()) return;
    setPostingHomework(true);
    try {
      await fetch(`${API_URL}/api/homework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: activeClass, english_text: homeworkText, posted_by: 'Teacher' }),
      });
      setHomeworkText('');
      setHomeworkPosted(true);
      setTimeout(() => setHomeworkPosted(false), 3000);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setPostingHomework(false);
    }
  };

  const markedCount = students.filter((s) => attendance[s.id]).length;
  const presentCount = students.filter((s) => attendance[s.id] === 'present').length;
  const absentCount = students.filter((s) => attendance[s.id] === 'absent').length;
  const unmarkedCount = students.length - markedCount;

  return (
    <div className="max-w-3xl space-y-4">
      {assignedClasses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {assignedClasses.map((c) => (
            <button
              key={c}
              onClick={() => setActiveClass(c)}
              className={`text-sm px-3 py-1.5 rounded-full border ${
                activeClass === c ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {(['attendance', 'homework', 'compose'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-sm px-3 py-1.5 rounded-t-lg shrink-0 ${
              activeTab === tab ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'attendance' ? '📋 Attendance' : tab === 'homework' ? '📚 Homework' : '📢 Compose'}
          </button>
        ))}
      </div>

      {activeTab === 'attendance' && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Today's Attendance — {activeClass}</h3>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{presentCount}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Present</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-red-700">{absentCount}</p>
              <p className="text-[10px] text-red-600 font-medium">Absent</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-600">{unmarkedCount}</p>
              <p className="text-[10px] text-slate-500 font-medium">Not marked</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-2">
            {markedCount} of {students.length} students marked
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-87.5">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => markStudent(s.id, 'present')}
                            disabled={marking === s.id}
                            className={`text-xs px-3 py-1 rounded-full border ${
                              attendance[s.id] === 'present'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => markStudent(s.id, 'absent')}
                            disabled={marking === s.id}
                            className={`text-xs px-3 py-1 rounded-full border ${
                              attendance[s.id] === 'absent'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                        No students found for {activeClass}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'homework' && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Post Homework — {activeClass}</h3>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <textarea
              value={homeworkText}
              onChange={(e) => setHomeworkText(e.target.value)}
              rows={3}
              placeholder="Type today's homework..."
              className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={postHomework}
              disabled={postingHomework || !homeworkText.trim()}
              className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {postingHomework ? 'Translating & Sending...' : 'Post Homework to Parents'}
            </button>
            {homeworkPosted && <p className="text-sm text-emerald-600 font-medium mt-2">✅ Homework sent to {activeClass} parents</p>}
          </div>

          {homeworkHistory.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate-500">Recent homework</p>
              {homeworkHistory.map((h) => (
                <div key={h.id} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-800 wrap-break-word">{h.english_text}</p>
                  <p className="text-xs text-slate-500 mt-1 wrap-break-word">{h.tamil_text}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(h.posted_at).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'compose' && <TeacherCompose activeClass={activeClass} />}
    </div>
  );
}