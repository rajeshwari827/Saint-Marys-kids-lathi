import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Calendar, Search, User, Clock, ArrowRight, ArrowLeft, Plus, CheckCircle2, X, Share2, Copy, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Attendance() {
  const [logs, setLogs] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'student'>('daily');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [studentLogs, setStudentLogs] = useState<any[]>([]);
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markData, setMarkData] = useState({ teacherId: '', status: 'present' });
  const [showClassLinks, setShowClassLinks] = useState(false);

  const standards = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5', 'Std 6', 'Std 7', 'Std 8'];

  useEffect(() => {
    fetchData();
  }, [dateFilter, viewMode, selectedMonth]);

  async function fetchData() {
    setLoading(true);
    try {
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const tList = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(tList);

      if (viewMode === 'daily') {
        const q = query(
          collection(db, 'attendance'),
          where('date', '==', dateFilter),
          orderBy('createdAt', 'desc')
        );
        const logsSnap = await getDocs(q);
        const lList = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLogs(lList);
      } else if (viewMode === 'monthly') {
        // Fetch logs for the full month
        const startOfMonth = `${selectedMonth}-01`;
        const endOfMonth = `${selectedMonth}-31`; // Simplified, Firestore range query works
        
        const q = query(
          collection(db, 'attendance'),
          where('date', '>=', startOfMonth),
          where('date', '<=', endOfMonth)
        );
        const logsSnap = await getDocs(q);
        const lList = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLogs(lList);
      } else if (viewMode === 'student') {
        const q = query(
          collection(db, 'student_attendance'),
          where('date', '==', dateFilter)
        );
        const snap = await getDocs(q);
        setStudentLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Unknown Teacher';

  // Calculate monthly summary
  const teacherMonthlySummary = teachers.map(teacher => {
    const teacherLogs = logs.filter(log => log.teacherId === teacher.id);
    
    // Get unique days from logs
    const scanDays = new Set(teacherLogs.filter(l => !l.isHoliday).map(log => log.date));
    const holidayDays = new Set(teacherLogs.filter(l => l.isHoliday).map(log => log.date));
    const sundayDays = new Set<string>();
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      if (date.getDay() === 0) { // Sunday
        sundayDays.add(format(date, 'yyyy-MM-dd'));
      }
    }

    // Combine for distinct presence
    const allPresentDays = new Set([...scanDays, ...holidayDays, ...sundayDays]);
    const attendanceCount = allPresentDays.size;
    const absentCount = Math.max(0, totalDaysInMonth - attendanceCount);
    
    return {
      ...teacher,
      totalDaysInMonth,
      sundayCount: sundayDays.size,
      holidayCount: holidayDays.size,
      actualPresence: scanDays.size,
      attendanceCount,
      absentCount,
      logs: teacherLogs
    };
  }).sort((a, b) => b.attendanceCount - a.attendanceCount);

  const filteredLogs = logs.filter(log => 
    getTeacherName(log.teacherId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStudentLogs = studentLogs.filter(log => 
    log.standard.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSummary = teacherMonthlySummary.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleManualMark = async () => {
    if (!markData.teacherId) return;
    setMarking(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Check if already exists
      const q = query(
        collection(db, 'attendance'),
        where('teacherId', '==', markData.teacherId),
        where('date', '==', today)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        alert('Attendance already recorded for this teacher today.');
        setMarking(false);
        return;
      }

      if (markData.status === 'present') {
        const entryDate = setMinutes(setHours(new Date(), 8), 0);
        const exitDate = setMinutes(setHours(new Date(), 14), 0);
        await addDoc(collection(db, 'attendance'), {
          teacherId: markData.teacherId,
          date: today,
          entryTime: entryDate,
          exitTime: exitDate,
          isManual: true,
          createdAt: serverTimestamp()
        });
      }
      
      setIsMarkModalOpen(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'attendance');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Attendance Center</h1>
          <p className="text-slate-500 font-medium">Track daily logs and class-wise student attendance</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowClassLinks(!showClassLinks)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm border ${
              showClassLinks ? 'bg-navy-50 border-navy-200 text-navy-900' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Share2 className="w-4 h-4" />
            Class Links
          </button>
          <button 
            onClick={() => setIsMarkModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-navy-900 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Manual Mark
          </button>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'daily' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-600'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'monthly' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-600'
              }`}
            >
              Salary Tally
            </button>
            <button
              onClick={() => setViewMode('student')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'student' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-600'
              }`}
            >
              Students
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <Calendar className="w-5 h-5 text-navy-500 ml-2" />
            {viewMode === 'daily' ? (
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 bg-transparent focus:outline-none font-bold text-navy-900"
              />
            ) : (
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-transparent focus:outline-none font-bold text-navy-900"
              />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showClassLinks && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">Shareable Attendance Links</h2>
                  <p className="text-slate-500 text-sm">Copy these links and send them to respective class teachers</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl">
                  <LinkIcon className="w-6 h-6 text-amber-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {standards.map(std => {
                  const link = `${window.location.origin}/class-attendance/${encodeURIComponent(std)}`;
                  return (
                    <div key={std} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3 group">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-navy-900">{std}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(link);
                            alert(`Link for ${std} copied!`);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-navy-900 hover:text-white hover:border-navy-900 transition-all shadow-sm"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Link
                        </button>
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-white border border-slate-200 text-slate-400 rounded-lg hover:text-navy-600 hover:border-navy-200 transition-all shadow-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by teacher name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all font-medium"
            />
          </div>
          {viewMode === 'monthly' && (
            <div className="hidden md:flex items-center gap-4 text-xs font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-navy-900 rounded-sm" /> Present
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-rose-100 rounded-sm" /> Absent
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'daily' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Teacher</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Entry Time</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Exit Time</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-navy-50 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-navy-600" />
                        </div>
                        <span className="font-bold text-navy-900">{getTeacherName(log.teacherId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{log.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold">
                        <ArrowRight className="w-4 h-4" />
                        {log.entryTime ? format(log.entryTime.toDate(), 'hh:mm a') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 font-bold ${log.exitTime ? 'text-blue-600' : 'text-slate-300'}`}>
                        <ArrowLeft className="w-4 h-4" />
                        {log.exitTime ? format(log.exitTime.toDate(), 'hh:mm a') : 'Not Checked Out'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        log.exitTime ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {log.exitTime ? 'Shift Complete' : 'Active Shift'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : viewMode === 'student' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Standard</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Total Students</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Present</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Absent</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {standards.map(std => {
                  const log = filteredStudentLogs.find(l => l.standard === std);
                  const isSubmitted = !!log;
                  
                  return (
                    <tr key={std} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-navy-900">{std}</td>
                      <td className="px-6 py-4 text-center text-slate-500 font-medium">{dateFilter}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500">{log?.totalCount || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600">{log?.presentCount || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-rose-500">{(log?.totalCount - log?.presentCount) || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isSubmitted ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isSubmitted ? 'Submitted' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Faculty Name</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Total Days</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Sundays</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Holidays</th>
                  <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Presence</th>
                  <th className="px-4 py-4 text-xs font-black text-navy-900 uppercase tracking-widest text-center bg-navy-50">Net Present</th>
                  <th className="px-4 py-4 text-xs font-black text-rose-500 uppercase tracking-widest text-center bg-rose-50/50">Absent</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Tally %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSummary.map((teacher) => {
                  const percentage = Math.min(100, Math.round((teacher.attendanceCount / teacher.totalDaysInMonth) * 100));
                  
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-navy-50 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-navy-600" />
                          </div>
                          <div>
                            <span className="font-bold text-navy-900 block leading-none mb-1">{teacher.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{teacher.subject}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-400">{teacher.totalDaysInMonth}</td>
                      <td className="px-4 py-4 text-center font-bold text-blue-600">{teacher.sundayCount}</td>
                      <td className="px-4 py-4 text-center font-bold text-amber-600">{teacher.holidayCount}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-600">{teacher.actualPresence}</td>
                      <td className="px-4 py-4 text-center bg-navy-50/50">
                        <span className="px-3 py-1 bg-navy-900 text-white rounded-lg text-sm font-black">
                          {teacher.attendanceCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center bg-rose-50/30">
                        <span className={`px-2 py-1 rounded-lg text-sm font-black ${teacher.absentCount > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                          {teacher.absentCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className={`font-black text-xs ${percentage > 90 ? 'text-emerald-600' : percentage > 75 ? 'text-navy-900' : 'text-rose-500'}`}>
                            {percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {((viewMode === 'daily' && filteredLogs.length === 0) || (viewMode === 'monthly' && filteredSummary.length === 0)) && !loading && (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-slate-200" />
              </div>
              <p className="text-slate-400 font-medium">No records found for this selection.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isMarkModalOpen && (
          <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-navy-900 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-xl leading-none mb-1">Manual Attendance</h3>
                  <p className="text-navy-300 text-xs text-sh-500">Override attendance for today</p>
                </div>
                <button onClick={() => setIsMarkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><X /></button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Select Faculty</label>
                  <select 
                    value={markData.teacherId} 
                    onChange={e => setMarkData({...markData, teacherId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold focus:ring-2 focus:ring-navy-500 outline-none"
                  >
                    <option value="">Choose Teacher...</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleManualMark}
                    disabled={marking || !markData.teacherId}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-navy-900 text-white rounded-xl font-bold hover:bg-navy-800 disabled:opacity-50 shadow-xl shadow-navy-100 transition-all"
                  >
                    {marking ? 'Processing...' : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Mark as Present
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setIsMarkModalOpen(false)}
                    className="px-6 py-4 bg-slate-50 text-slate-500 rounded-xl font-bold hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
