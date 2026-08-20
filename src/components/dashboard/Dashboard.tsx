import { useState, useEffect } from 'react';
import type { Student } from '../../types';
import AnalyticsSummary from './AnalyticsSummary';
import BirthdayAutomation from '../students/BirthdayAutomation';
import UpcomingEvents from './UpcomingEvents';
import NotableDaysTicker from './NotableDaysTicker';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetch('http://localhost:4000/api/students')
      .then((res) => res.json())
      .then((data) => {
        const mapped: Student[] = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          class: s.class,
          parentPhone: s.parent_phone,
          birthday: s.birthday,
        }));
        setStudents(mapped);
      })
      .catch((err) => console.error('Failed to load students', err));
  }, []);

  return (
    <div className="max-w-4xl space-y-4">
      <NotableDaysTicker />
      <AnalyticsSummary />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BirthdayAutomation students={students} />
        <UpcomingEvents />
      </div>
    </div>
  );
}