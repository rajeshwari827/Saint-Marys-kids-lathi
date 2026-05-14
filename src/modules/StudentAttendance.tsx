import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, getDocs, query, where, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Check, X, Users, Calendar, ArrowLeft, Save, Loader2, Share2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Student {
  id: string;
  name: string;
  standard: string;
  grNumber: string;
  feeType?: string;
}

export default function StudentAttendance() {
  const { standard } = useParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [date] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (standard) {
      fetchStudents();
      checkExistingAttendance();
    }
  }, [standard]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('standard', '==', standard));
      const snap = await getDocs(q);
      const studentList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)).sort((a,b) => a.name.localeCompare(b.name));
      setStudents(studentList);
      
      // Default all to present
      const initialAttendance: Record<string, boolean> = {};
      studentList.forEach(s => initialAttendance[s.id] = true);
      setAttendance(initialAttendance);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function checkExistingAttendance() {
    try {
      const q = query(
        collection(db, 'student_attendance'), 
        where('standard', '==', standard),
        where('date', '==', date)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAlreadyMarked(true);
        const data = snap.docs[0].data();
        setAttendance(data.records || {});
      }
    } catch (error) {
      console.error(error);
    }
  }

  const toggleStatus = (id: string) => {
    if (alreadyMarked) return;
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    if (alreadyMarked || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'student_attendance'), {
        standard,
        date,
        records: attendance,
        presentCount: Object.values(attendance).filter(v => v).length,
        totalCount: students.length,
        createdAt: serverTimestamp()
      });
      setAlreadyMarked(true);
      alert(`Attendance for ${standard} saved successfully!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'student_attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-navy-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-navy-900 text-white p-6 sticky top-0 z-50 shadow-xl shadow-navy-100/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">{standard} Attendance</h1>
            <p className="text-navy-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {alreadyMarked && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-emerald-900 font-bold text-sm">Attendance Already Recorded</p>
              <p className="text-emerald-700 text-xs">Today's records for {standard} are locked.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Present</p>
            <p className="text-2xl font-black text-emerald-600">
              {Object.values(attendance).filter(v => v).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Absent</p>
            <p className="text-2xl font-black text-rose-600">
              {Object.values(attendance).filter(v => !v).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Student Name</span>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest text-right">Status</span>
          </div>
          
          <div className="divide-y divide-slate-50">
            {students.map((student) => (
              <div 
                key={student.id}
                onClick={() => toggleStatus(student.id)}
                className={`p-4 flex items-center justify-between active:bg-slate-50 transition-colors cursor-pointer ${attendance[student.id] ? '' : 'bg-rose-50/30'}`}
              >
                <div>
                  <p className="font-bold text-navy-900">{student.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">GR: {student.grNumber}</p>
                </div>
                
                <div className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${attendance[student.id] ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm flex items-center justify-center ${attendance[student.id] ? 'left-7' : 'left-1'}`}>
                    {attendance[student.id] ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <X className="w-3 h-3 text-rose-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {!alreadyMarked && (
        <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center no-print">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full max-w-2xl bg-navy-900 text-white py-5 rounded-[2rem] font-bold text-lg shadow-2xl shadow-navy-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Saving Records...
              </>
            ) : (
              <>
                <Save className="w-6 h-6" />
                Submit Attendance
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
