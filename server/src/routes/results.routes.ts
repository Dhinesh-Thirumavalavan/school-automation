import express from 'express';
import { supabase } from '../services/supabase.service';

const router = express.Router();

function gradeFromMarks(marks: number, maxMarks: number) {
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

// Admin: class roster for a given term+subject, with existing marks if any —
// used to bulk-enter/edit results for a whole class at once.
router.get('/roster', async (req, res) => {
  try {
    const { class: studentClass, term, subject } = req.query as { class?: string; term?: string; subject?: string };
    if (!studentClass || !term || !subject) {
      return res.status(400).json({ error: 'class, term, and subject query params are required' });
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name, roll_no')
      .eq('class', studentClass)
      .order('name');
    if (studentsError) throw studentsError;

    const studentIds = (students || []).map((s) => s.id);
    const { data: existing } = studentIds.length
      ? await supabase.from('student_progress').select('*').in('student_id', studentIds).eq('term', term).eq('subject', subject)
      : { data: [] };

    const byStudent = new Map((existing || []).map((r) => [r.student_id, r]));
    res.json(
      (students || []).map((s) => {
        const row = byStudent.get(s.id);
        return {
          student_id: s.id,
          name: s.name,
          roll_no: s.roll_no,
          progress_id: row?.id || null,
          marks: row?.marks ?? null,
          max_marks: row?.max_marks ?? 100,
          grade: row?.grade ?? null,
        };
      })
    );
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: bulk save marks for a whole class at once (one term+subject)
router.post('/bulk', async (req, res) => {
  try {
    const { term, subject, entries } = req.body as {
      term: string;
      subject: string;
      entries: { student_id: string; marks: number; max_marks: number; grade?: string }[];
    };
    if (!term || !subject || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'term, subject, and entries[] are required' });
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (entry.marks === null || entry.marks === undefined) return; // skip blanks — not every student needs a mark this pass
        const grade = entry.grade || gradeFromMarks(entry.marks, entry.max_marks || 100);
        const { data: existing } = await supabase
          .from('student_progress')
          .select('id')
          .eq('student_id', entry.student_id)
          .eq('term', term)
          .eq('subject', subject)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('student_progress')
            .update({ marks: entry.marks, max_marks: entry.max_marks || 100, grade })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('student_progress')
            .insert([{ student_id: entry.student_id, term, subject, marks: entry.marks, max_marks: entry.max_marks || 100, grade }]);
        }
      })
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Parent: all results for a student, most recent term first
router.get('/student/:studentId', async (req, res) => {
  const { data, error } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', req.params.studentId)
    .order('term', { ascending: false })
    .order('subject');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
