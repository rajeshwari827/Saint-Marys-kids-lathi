import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, StudentStandard, Result, Mark } from '../types';
import { SUBJECTS_CONFIG } from '../constants/subjects';
import { calculateMark, calculateResultTotals } from '../lib/resultUtils';
import { GraduationCap, Search, Plus, Save, Printer, ArrowLeft, ChevronRight, User, Calculator, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import ResultCard from './ResultCard';

const Results: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatingAttendance, setCalculatingAttendance] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<StudentStandard | ''>('');
  const [selectedSemester, setSelectedSemester] = useState<1 | 2 | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [currentResult, setCurrentResult] = useState<Result | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'print'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchResults();
  }, []);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'students'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'students');
    }
  };

  const fetchResults = async () => {
    try {
      const snap = await getDocs(collection(db, 'results'));
      setResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result)));
      setLoading(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'results');
    }
  };

  const handleCreateResult = (student: Student) => {
    const existing = results.find(r => r.studentId === student.id);
    if (existing) {
      setCurrentResult(existing);
    } else {
      const newResult: Partial<Result> = {
        studentId: student.id,
        standard: student.standard,
        rollNo: '',
        academicYear: '2025-26',
        semester1: {},
        semester2: {},
        attendance: { sem1: '', sem2: '' }
      };
      setCurrentResult(newResult as Result);
    }
    setSelectedStudent(student);
    setView('edit');
  };

  const handleSaveMarks = async () => {
    if (!currentResult || !selectedStudent) return;
    
    // Validation: Check Roll No
    if (!currentResult.rollNo?.trim()) {
      alert("Please enter a Roll Number before saving.");
      return;
    }

    // Validation: Check Marks Limits
    const isKinder = [StudentStandard.NURSERY, StudentStandard.LKG, StudentStandard.UKG].includes(selectedStudent.standard);
    const maxSA = 
      [StudentStandard.NURSERY, StudentStandard.LKG, StudentStandard.UKG].includes(selectedStudent.standard) ? 100 :
      [StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80;

    const marks1 = Object.values(currentResult.semester1);
    const marks2 = Object.values(currentResult.semester2);
    const allMarks = [...marks1, ...marks2];

    if (!isKinder) {
      const invalidFA = allMarks.find(m => 
        (m.fa1 !== undefined && m.fa1 > 20) || 
        (m.fa2 !== undefined && m.fa2 > 20)
      );

      if (invalidFA) {
        alert("Unit Test marks (FA) cannot exceed 20.");
        return;
      }
    }

    const invalidSA = allMarks.find(m => !m.grade && m.sa1 !== undefined && m.sa1 > maxSA);
    if (invalidSA) {
      alert(`Terminal Exam (SA) marks cannot exceed ${maxSA} for ${selectedStudent.standard}.`);
      return;
    }
    
    try {
      const resultData = {
        ...currentResult,
        updatedAt: serverTimestamp(),
      };

      if (currentResult.id) {
        await updateDoc(doc(db, 'results', currentResult.id), resultData);
      } else {
        const docRef = await addDoc(collection(db, 'results'), {
          ...resultData,
          createdAt: serverTimestamp(),
        });
        currentResult.id = docRef.id;
      }
      
      await fetchResults();
      setView('list');
      setCurrentResult(null);
      setSelectedStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'results');
    }
  };

  const handleCalculateAttendance = async (sem: 1 | 2) => {
    if (!selectedStudent) return;
    setCalculatingAttendance(true);
    try {
      // Semester date ranges (Adjustable based on school calendar)
      let startDate = '2025-06-01';
      let endDate = sem === 1 ? '2025-10-31' : '2026-04-30';
      if (sem === 2) startDate = '2025-11-01';

      const q = query(
        collection(db, 'student_attendance'),
        where('standard', '==', selectedStudent.standard),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

      const snap = await getDocs(q);
      let workingDays = 0;
      let presentDays = 0;

      snap.forEach(doc => {
        const data = doc.data();
        workingDays++;
        if (data.records && data.records[selectedStudent.id] === true) {
          presentDays++;
        }
      });

      const attendanceStr = `${presentDays}/${workingDays}`;
      
      setCurrentResult(prev => {
        if (!prev) return null;
        return {
          ...prev,
          attendance: {
            ...prev.attendance,
            [sem === 1 ? 'sem1' : 'sem2']: attendanceStr
          }
        };
      });

    } catch (error) {
      console.error("Error calculating attendance:", error);
    } finally {
      setCalculatingAttendance(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.grNumber.includes(searchTerm);
    const matchesStandard = selectedStandard ? s.standard === selectedStandard : true;
    return matchesSearch && matchesStandard;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {view === 'list' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-navy-900">Result Management</h1>
              <p className="text-slate-500 font-medium tracking-tight">
                {selectedSemester ? `Manage Semester ${selectedSemester} Performance` : 'Select a semester to get started'}
              </p>
            </div>
          </div>

          {!selectedSemester ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-12">
              {[1, 2].map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem as 1 | 2)}
                  className="group relative bg-white p-10 rounded-[2.5rem] border-2 border-slate-100 hover:border-navy-500 hover:shadow-2xl hover:shadow-navy-900/10 transition-all text-center overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-navy-50 rounded-full -mr-16 -mt-16 group-hover:bg-navy-100 transition-colors" />
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-navy-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                      <Calculator className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-black text-navy-900 mb-2">Semester {sem}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {sem === 1 
                        ? 'Enter and print midterm exam results for all students.' 
                        : 'Manage final comprehensive results showing annual progress.'}
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-2 text-navy-900 font-black uppercase tracking-widest text-xs">
                      Start Entry <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <>
              <button 
                onClick={() => { setSelectedSemester(null); setSelectedStandard(''); }}
                className="mb-8 flex items-center gap-2 text-navy-600 hover:text-navy-900 font-bold text-sm bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Change Semester
              </button>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-8 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search student by name or GR number..."
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-navy-500/10 focus:border-navy-500 transition-all outline-none"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-navy-500/10 focus:border-navy-500 transition-all outline-none appearance-none bg-white font-bold text-navy-900 cursor-pointer"
                    value={selectedStandard}
                    onChange={(e) => setSelectedStandard(e.target.value as StudentStandard)}
                  >
                    <option value="">All Standards (Classes)</option>
                    {Object.values(StudentStandard).map(std => (
                      <option key={std} value={std}>{std}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedStandard ? (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                  <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-400">Please select a class (standard) first</h2>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map(student => {
                    const result = results.find(r => r.studentId === student.id);
                    const isEntered = selectedSemester === 1 
                      ? Object.keys(result?.semester1 || {}).length > 0
                      : Object.keys(result?.semester2 || {}).length > 0;

                    return (
                      <div 
                        key={student.id}
                        className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-navy-200 hover:shadow-xl hover:shadow-navy-900/5 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-navy-50 transition-colors">
                            <User className="w-6 h-6 text-slate-400 group-hover:text-navy-500" />
                          </div>
                          {isEntered ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                              Marks Entered
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">
                              Pending
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-navy-900 text-lg leading-tight mb-1">{student.name}</h3>
                        <p className="text-slate-500 text-sm mb-4">{student.standard} • GR: {student.grNumber}</p>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCreateResult(student)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-navy-900 text-white rounded-xl font-bold hover:bg-navy-800 transition-colors shadow-lg shadow-navy-900/10"
                          >
                            {isEntered ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isEntered ? 'Update' : 'Enter Marks'}
                          </button>
                          {isEntered && (
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setCurrentResult(result!);
                                setView('print');
                              }}
                              className="px-4 py-3 bg-slate-100 text-navy-900 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {view === 'edit' && currentResult && selectedStudent && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <header className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => { setView('list'); setSelectedStudent(null); setCurrentResult(null); }}
              className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-navy-900" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-navy-900">Enter Marks: {selectedStudent.name}</h1>
              <p className="text-slate-500 font-medium">{selectedStudent.standard} • GR: {selectedStudent.grNumber}</p>
            </div>
          </header>

          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-navy-900 uppercase tracking-widest">Academic Details</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">Roll No</span>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-navy-500"
                      value={currentResult.rollNo}
                      onChange={(e) => setCurrentResult({...currentResult, rollNo: e.target.value})}
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">Year</span>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-navy-500"
                      value={currentResult.academicYear}
                      onChange={(e) => setCurrentResult({...currentResult, academicYear: e.target.value})}
                      placeholder="2025-26"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-bold text-navy-900 uppercase tracking-widest">Attendance</label>
                  <button 
                    type="button"
                    onClick={() => handleCalculateAttendance(selectedSemester as 1 | 2)}
                    className="text-[10px] font-black text-navy-600 flex items-center gap-1 hover:text-navy-800 bg-navy-50 px-2 py-1 rounded"
                  >
                    {calculatingAttendance ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Calculator className="w-3 h-3" />}
                    Sync from Logs
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">Sem 1</span>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-navy-500"
                      value={currentResult.attendance?.sem1 || ''}
                      onChange={(e) => setCurrentResult({
                        ...currentResult, 
                        attendance: { ...currentResult.attendance!, sem1: e.target.value } 
                      })}
                      placeholder="e.g. 153/245"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1">Sem 2</span>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-navy-500"
                      value={currentResult.attendance?.sem2 || ''}
                      onChange={(e) => setCurrentResult({
                        ...currentResult, 
                        attendance: { ...currentResult.attendance!, sem2: e.target.value } 
                      })}
                      placeholder="e.g. 233/245"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="pb-4 font-black uppercase text-xs tracking-widest text-slate-400">Subject</th>
                    <th className="pb-4 font-black uppercase text-xs tracking-widest text-navy-900 border-l border-slate-100 pl-4" colSpan={4}>Semester 1</th>
                    {selectedSemester === 2 && (
                      <th className="pb-4 font-black uppercase text-xs tracking-widest text-navy-900 border-l border-slate-100 pl-4" colSpan={4}>Semester 2</th>
                    )}
                  </tr>
                  <tr className="text-[10px] uppercase tracking-widest text-slate-400">
                    <th className="pb-6"></th>
                    <th className="pb-6 border-l border-slate-100 pl-4">FA1</th>
                    <th className="pb-6">FA2</th>
                    <th className="pb-6">SA1</th>
                    <th className="pb-6">INT</th>
                    {selectedSemester === 2 && (
                      <>
                        <th className="pb-6 border-l border-slate-100 pl-4">FA3</th>
                        <th className="pb-6">FA4</th>
                        <th className="pb-6">SA2</th>
                        <th className="pb-6">INT</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SUBJECTS_CONFIG[selectedStudent.standard]?.map(sub => {
                    const isKinder = [StudentStandard.NURSERY, StudentStandard.LKG, StudentStandard.UKG].includes(selectedStudent.standard);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4">
                          <span className="font-bold text-navy-900">{sub.name}</span>
                          {sub.isGradeOnly && <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded uppercase">Grade Only</span>}
                        </td>
                        {/* Sem 1 */}
                        {isKinder ? (
                          <>
                            <td className="py-2 border-l border-slate-100 pl-4" colSpan={4}>
                              <div className="space-y-1">
                                <input 
                                  type={sub.isGradeOnly ? "text" : "number"}
                                  placeholder={sub.isGradeOnly ? "Grade" : "Marks (Out of 100)"}
                                  max="100"
                                  className={`w-full max-w-[200px] p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors ${sub.isGradeOnly ? 'bg-amber-50 border-amber-200' : ''}`}
                                  value={sub.isGradeOnly ? (currentResult.semester1[sub.id]?.grade ?? '') : (currentResult.semester1[sub.id]?.sa1 ?? '')}
                                  onChange={(e) => {
                                    const val = sub.isGradeOnly ? e.target.value : parseInt(e.target.value);
                                    if (!sub.isGradeOnly && typeof val === 'number' && val > 100) return;
                                    const sem1 = { ...currentResult.semester1 };
                                    if (sub.isGradeOnly) {
                                      sem1[sub.id] = { ...sem1[sub.id], grade: val as string };
                                    } else {
                                      sem1[sub.id] = { ...sem1[sub.id], sa1: val as number };
                                    }
                                    setCurrentResult({ ...currentResult, semester1: sem1 });
                                  }}
                                />
                                {!sub.isGradeOnly && <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">Max 100</span>}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2 border-l border-slate-100 pl-4">
                              {!sub.isGradeOnly && (
                                <div className="space-y-1">
                                  <input 
                                    type="number"
                                    max="20"
                                    className="w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors"
                                    value={currentResult.semester1[sub.id]?.fa1 ?? ''}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (val > 20) return;
                                      const sem1 = { ...currentResult.semester1 };
                                      sem1[sub.id] = { ...sem1[sub.id], fa1: val };
                                      setCurrentResult({ ...currentResult, semester1: sem1 });
                                    }}
                                  />
                                  <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">Max 20</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2">
                              {!sub.isGradeOnly && (
                                <div className="space-y-1">
                                  <input 
                                    type="number"
                                    max="20"
                                    className="w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors"
                                    value={currentResult.semester1[sub.id]?.fa2 ?? ''}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (val > 20) return;
                                      const sem1 = { ...currentResult.semester1 };
                                      sem1[sub.id] = { ...sem1[sub.id], fa2: val };
                                      setCurrentResult({ ...currentResult, semester1: sem1 });
                                    }}
                                  />
                                  <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">Max 20</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2">
                              <div className="space-y-1">
                                <input 
                                  type={sub.isGradeOnly ? "text" : "number"}
                                  placeholder={sub.isGradeOnly ? "Grade" : ""}
                                  max={[StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80}
                                  className={`w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors ${sub.isGradeOnly ? 'bg-amber-50 border-amber-200 w-24' : ''}`}
                                  value={sub.isGradeOnly ? (currentResult.semester1[sub.id]?.grade ?? '') : (currentResult.semester1[sub.id]?.sa1 ?? '')}
                                  onChange={(e) => {
                                    const val = sub.isGradeOnly ? e.target.value : parseInt(e.target.value);
                                    if (!sub.isGradeOnly && typeof val === 'number' && val > ([StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80)) return;
                                    const sem1 = { ...currentResult.semester1 };
                                    if (sub.isGradeOnly) {
                                      sem1[sub.id] = { ...sem1[sub.id], grade: val as string };
                                    } else {
                                      sem1[sub.id] = { ...sem1[sub.id], sa1: val as number };
                                    }
                                    setCurrentResult({ ...currentResult, semester1: sem1 });
                                  }}
                                />
                                {!sub.isGradeOnly && (
                                  <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">
                                    Max {[StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2">
                              {!sub.isGradeOnly && (
                                <input 
                                  type="number"
                                  className="w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold"
                                  value={currentResult.semester1[sub.id]?.internal ?? ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    const sem1 = { ...currentResult.semester1 };
                                    sem1[sub.id] = { ...sem1[sub.id], internal: val };
                                    setCurrentResult({ ...currentResult, semester1: sem1 });
                                  }}
                                />
                              )}
                            </td>
                          </>
                        )}

                        {/* Sem 2 */}
                        {selectedSemester === 2 && (
                          isKinder ? (
                            <>
                              <td className="py-2 border-l border-slate-100 pl-4" colSpan={4}>
                                <div className="space-y-1">
                                  <input 
                                    type={sub.isGradeOnly ? "text" : "number"}
                                    placeholder={sub.isGradeOnly ? "Grade" : "Marks (Out of 100)"}
                                    max="100"
                                    className={`w-full max-w-[200px] p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors ${sub.isGradeOnly ? 'bg-amber-50 border-amber-200' : ''}`}
                                    value={sub.isGradeOnly ? (currentResult.semester2[sub.id]?.grade ?? '') : (currentResult.semester2[sub.id]?.sa1 ?? '')}
                                    onChange={(e) => {
                                      const val = sub.isGradeOnly ? e.target.value : parseInt(e.target.value);
                                      if (!sub.isGradeOnly && typeof val === 'number' && val > 100) return;
                                      const sem2 = { ...currentResult.semester2 };
                                      if (sub.isGradeOnly) {
                                        sem2[sub.id] = { ...sem2[sub.id], grade: val as string };
                                      } else {
                                        sem2[sub.id] = { ...sem2[sub.id], sa1: val as number };
                                      }
                                      setCurrentResult({ ...currentResult, semester2: sem2 });
                                    }}
                                  />
                                  {!sub.isGradeOnly && <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">Max 100</span>}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-2 border-l border-slate-100 pl-4">
                                {!sub.isGradeOnly && (
                                  <div className="space-y-1">
                                    <input 
                                      type="number"
                                      max="20"
                                      className="w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors"
                                      value={currentResult.semester2[sub.id]?.fa1 ?? ''}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val > 20) return;
                                        const sem2 = { ...currentResult.semester2 };
                                        sem2[sub.id] = { ...sem2[sub.id], fa1: val };
                                        setCurrentResult({ ...currentResult, semester2: sem2 });
                                      }}
                                    />
                                    <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">Max 20</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2">
                                {!sub.isGradeOnly && (
                                  <div className="space-y-1">
                                    <input 
                                      type="number"
                                      max="20"
                                      className="w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors"
                                      value={currentResult.semester2[sub.id]?.fa2 ?? ''}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val > 20) return;
                                        const sem2 = { ...currentResult.semester2 };
                                        sem2[sub.id] = { ...sem2[sub.id], fa2: val };
                                        setCurrentResult({ ...currentResult, semester2: sem2 });
                                      }}
                                    />
                                    <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">Max 20</span>
                                  </div>
                                )}
                              </td>
                              <td className="py-2">
                                <div className="space-y-1">
                                  <input 
                                    type={sub.isGradeOnly ? "text" : "number"}
                                    placeholder={sub.isGradeOnly ? "Grade" : ""}
                                    max={[StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80}
                                    className={`w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold focus:border-navy-500 transition-colors ${sub.isGradeOnly ? 'bg-amber-50 border-amber-200 w-24' : ''}`}
                                    value={sub.isGradeOnly ? (currentResult.semester2[sub.id]?.grade ?? '') : (currentResult.semester2[sub.id]?.sa1 ?? '')}
                                    onChange={(e) => {
                                      const val = sub.isGradeOnly ? e.target.value : parseInt(e.target.value);
                                      if (!sub.isGradeOnly && typeof val === 'number' && val > ([StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80)) return;
                                      const sem2 = { ...currentResult.semester2 };
                                      if (sub.isGradeOnly) {
                                        sem2[sub.id] = { ...sem2[sub.id], grade: val as string };
                                      } else {
                                        sem2[sub.id] = { ...sem2[sub.id], sa1: val as number };
                                      }
                                      setCurrentResult({ ...currentResult, semester2: sem2 });
                                    }}
                                  />
                                  {!sub.isGradeOnly && (
                                    <span className="block text-[8px] text-slate-400 font-bold uppercase text-center">
                                      Max {[StudentStandard.STD1, StudentStandard.STD2, StudentStandard.STD3, StudentStandard.STD4, StudentStandard.STD5].includes(selectedStudent.standard) ? 40 : 80}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2">
                                {!sub.isGradeOnly && (
                                  <input 
                                    type="number"
                                    className="w-16 p-2 rounded-lg border border-slate-200 text-center text-sm font-bold"
                                    value={currentResult.semester2[sub.id]?.internal ?? ''}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      const sem2 = { ...currentResult.semester2 };
                                      sem2[sub.id] = { ...sem2[sub.id], internal: val };
                                      setCurrentResult({ ...currentResult, semester2: sem2 });
                                    }}
                                  />
                                )}
                              </td>
                            </>
                          )
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button
                onClick={() => { setView('list'); setView('list'); setSelectedStudent(null); setCurrentResult(null); }}
                className="px-8 py-3 rounded-2xl bg-white text-slate-500 font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMarks}
                className="px-12 py-3 rounded-2xl bg-navy-900 text-white font-bold hover:bg-navy-800 transition-shadow shadow-lg shadow-navy-900/10 flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Result
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {view === 'print' && currentResult && selectedStudent && (
        <div className="space-y-6">
          <header className="flex items-center justify-between no-print">
            <button 
              onClick={() => { setView('list'); setSelectedStudent(null); setCurrentResult(null); }}
              className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold text-navy-900"
            >
              <ArrowLeft className="w-5 h-5" /> Back to List
            </button>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-8 py-3 bg-navy-900 text-white rounded-2xl font-bold shadow-lg shadow-navy-900/10"
            >
              <Printer className="w-5 h-5" /> Print Result
            </button>
          </header>
          
          <ResultCard 
            student={selectedStudent} 
            result={currentResult} 
            selectedSemester={selectedSemester!}
          />
        </div>
      )}
    </div>
  );
};

export default Results;
