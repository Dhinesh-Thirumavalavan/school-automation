import { useState, useEffect } from 'react';
import type { Student } from '../../types';
import BirthdayAutomation from './BirthdayAutomation';
import StudentFormModal from './StudentFormModal';

const classOrder = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];

function isBirthdaySoon(birthday: string): boolean {
  const today = new Date();
  const [month, day] = birthday.split('-').map(Number);
  const bday = new Date(today.getFullYear(), month - 1, day);
  const diff = Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 7;
}

export default function StudentList() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/students');
      const data = await res.json();
      const mapped: Student[] = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        class: s.class,
        section: s.section,
        rollNo: s.roll_no,
        parentPhone: s.parent_phone,
        parentName: s.parent_name,
        alternatePhone: s.alternate_phone,
        gender: s.gender,
        address: s.address,
        bloodGroup: s.blood_group,
        admissionDate: s.admission_date,
        birthday: s.birthday,
      }));
      setStudents(mapped);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSave = async (student: Student) => {
    try {
      const body = JSON.stringify({
        name: student.name,
        class: student.class,
        section: student.section,
        roll_no: student.rollNo,
        parent_phone: student.parentPhone,
        parent_name: student.parentName,
        alternate_phone: student.alternatePhone,
        gender: student.gender,
        address: student.address,
        blood_group: student.bloodGroup,
        admission_date: student.admissionDate,
        birthday: student.birthday,
      });

      if (editing) {
        await fetch(`http://localhost:4000/api/students/${student.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } else {
        await fetch('http://localhost:4000/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      }
      await fetchStudents();
    } catch (err) {
      console.error('Failed to save student', err);
    }
    setShowForm(false);
    setEditing(undefined);
  };

  const toggleClass = (cls: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      next.has(cls) ? next.delete(cls) : next.add(cls);
      return next;
    });
  };

  const isSearching = search.trim().length > 0;

  const searchResults = isSearching
    ? students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  const groupedByClass = classOrder
    .map((cls) => ({
      cls,
      students: students
        .filter((s) => s.class === cls)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((g) => g.students.length > 0);

  const renderTable = (list: Student[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Section</th>
            <th className="px-4 py-2 font-medium">Roll No</th>
            <th className="px-4 py-2 font-medium">Parent Phone</th>
            <th className="px-4 py-2 font-medium">Birthday</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((s) => (
            <tr key={s.id} className={isBirthdaySoon(s.birthday) ? 'bg-amber-50/50' : ''}>
              <td className="px-4 py-2 font-medium text-slate-800">
                {s.name} {isBirthdaySoon(s.birthday) && <span className="ml-1">🎂</span>}
              </td>
              <td className="px-4 py-2 text-slate-600">{s.section || '—'}</td>
              <td className="px-4 py-2 text-slate-600">{s.rollNo || '—'}</td>
              <td className="px-4 py-2 text-slate-600">{s.parentPhone}</td>
              <td className="px-4 py-2 text-slate-600">{s.birthday}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => { setEditing(s); setShowForm(true); }}
                  className="text-xs text-emerald-700 font-medium hover:underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-5xl space-y-6">
      <BirthdayAutomation students={students} />

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-slate-800">
            All Students <span className="text-slate-400 font-normal">({students.length})</span>
          </h3>
          <button
            onClick={() => { setEditing(undefined); setShowForm(true); }}
            className="text-xs font-medium bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
          >
            + Add Student
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search any student by name (searches across all classes)..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">Loading students...</div>
        ) : isSearching ? (
          searchResults.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 bg-white border border-slate-200 rounded-xl">
              No students found for "{search}".
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {renderTable(searchResults)}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {groupedByClass.map(({ cls, students: classStudents }) => {
              const expanded = expandedClasses.has(cls);
              return (
                <div key={cls} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleClass(cls)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Class {cls}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {classStudents.length} student{classStudents.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</span>
                  </button>

                  {expanded && renderTable(classStudents)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <StudentFormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}