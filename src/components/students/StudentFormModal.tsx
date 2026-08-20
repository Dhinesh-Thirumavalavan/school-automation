import { useState } from 'react';
import type { Student } from '../../types';

interface StudentFormModalProps {
  initial?: Student;
  onSave: (student: Student) => void;
  onClose: () => void;
}

const classOptions = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8'];
const sectionOptions = ['A', 'B', 'C', 'D'];
const genderOptions = ['Male', 'Female', 'Other'];
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function StudentFormModal({ initial, onSave, onClose }: StudentFormModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [studentClass, setStudentClass] = useState(initial?.class ?? 'LKG');
  const [section, setSection] = useState(initial?.section ?? 'A');
  const [rollNo, setRollNo] = useState(initial?.rollNo ?? '');
  const [parentPhone, setParentPhone] = useState(initial?.parentPhone ?? '');
  const [parentName, setParentName] = useState(initial?.parentName ?? '');
  const [alternatePhone, setAlternatePhone] = useState(initial?.alternatePhone ?? '');
  const [gender, setGender] = useState(initial?.gender ?? 'Male');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [bloodGroup, setBloodGroup] = useState(initial?.bloodGroup ?? '');
  const [admissionDate, setAdmissionDate] = useState(initial?.admissionDate ?? '');
  const [birthday, setBirthday] = useState(initial?.birthday ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name,
      class: studentClass,
      section,
      rollNo,
      parentPhone,
      parentName,
      alternatePhone,
      gender,
      address,
      bloodGroup,
      admissionDate,
      birthday,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">
          {initial ? 'Edit Student' : 'Add Student'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Student Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Navishka"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
              <select
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Roll No</label>
              <input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. 24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {genderOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Birthday (MM-DD)
              </label>
              <input
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                required
                pattern="\d{2}-\d{2}"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="08-10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Not specified</option>
                {bloodGroupOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Admission Date</label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Parent / Guardian Details</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name</label>
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Suresh Kumar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Parent Phone (WhatsApp)</label>
              <input
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="919876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Phone</label>
              <input
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Optional"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 text-sm font-medium py-2 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}