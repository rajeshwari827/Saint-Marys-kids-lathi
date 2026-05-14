import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { OperationType } from '../lib/firestoreUtils';
import { Search, Plus, Calendar, User, MessageSquare, Trash2, Clock, Filter, Users, X } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function PTMLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStudent, setFilterStudent] = useState('all');

  const [formData, setFormData] = useState({
    studentId: '',
    parentName: '',
    meetingDate: format(new Date(), 'yyyy-MM-dd'),
    discussion: '',
    outcome: '',
    teacherName: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const logsSnap = await getDocs(query(collection(db, 'ptm_logs'), orderBy('meetingDate', 'desc')));
      const studentsSnap = await getDocs(collection(db, 'students'));
      
      setLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const student = students.find(s => s.id === formData.studentId);
      await addDoc(collection(db, 'ptm_logs'), {
        ...formData,
        studentName: student?.name || 'Unknown',
        standard: student?.standard || 'Unknown',
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setFormData({
        studentId: '',
        parentName: '',
        meetingDate: format(new Date(), 'yyyy-MM-dd'),
        discussion: '',
        outcome: '',
        teacherName: ''
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'ptm_logs');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.parentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStudent = filterStudent === 'all' || log.studentId === filterStudent;
    return matchesSearch && matchesStudent;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 tracking-tight">PTM Logs</h1>
          <p className="text-slate-500 font-medium">Record and track Parent-Teacher Meetings</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-navy-900 text-white rounded-2xl font-bold shadow-xl shadow-navy-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" />
          Log New Meeting
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student or parent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all font-medium"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all font-bold appearance-none"
          >
            <option value="all">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.standard})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLogs.map((log) => (
          <motion.div 
            layout
            key={log.id} 
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-50 group hover:shadow-xl hover:shadow-navy-50/50 transition-all border-l-4 border-l-navy-600"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-navy-50 rounded-2xl">
                <Users className="w-6 h-6 text-navy-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded">
                {format(new Date(log.meetingDate), 'dd MMM yyyy')}
              </span>
            </div>
            
            <h3 className="font-bold text-xl text-navy-900 mb-1">{log.studentName}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Parent: {log.parentName}</p>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-navy-400 mb-2">Discussion</p>
                <p className="text-sm text-navy-900 font-medium italic">"{log.discussion}"</p>
              </div>
              
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Outcome / Action</p>
                <p className="text-sm text-emerald-900 font-bold">{log.outcome}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-slate-500" />
                </div>
                <span className="text-xs font-bold text-slate-500">{log.teacherName}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-navy-900 text-white">
              <div>
                <h2 className="text-2xl font-bold">Log PTM Meeting</h2>
                <p className="text-navy-300 text-sm">Fill in the details of the parent interaction</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
                  <select 
                    required
                    value={formData.studentId}
                    onChange={e => setFormData({...formData, studentId: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 appearance-none font-medium"
                  >
                    <option value="">Choose Student</option>
                    {students.sort((a,b) => a.standard.localeCompare(b.standard)).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.standard})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Meeting Date</label>
                  <input 
                    required
                    type="date"
                    value={formData.meetingDate}
                    onChange={e => setFormData({...formData, meetingDate: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Parent / Guardian Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.parentName}
                    onChange={e => setFormData({...formData, parentName: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                    placeholder="e.g. Mr. Rajesh Nair"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Reporting Teacher</label>
                  <input 
                    required
                    type="text"
                    value={formData.teacherName}
                    onChange={e => setFormData({...formData, teacherName: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                    placeholder="Teacher Name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Discussion Points</label>
                <textarea 
                  required
                  rows={3}
                  value={formData.discussion}
                  onChange={e => setFormData({...formData, discussion: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                  placeholder="What was discussed during the meeting?"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Outcome / Next Steps</label>
                <textarea 
                  required
                  rows={2}
                  value={formData.outcome}
                  onChange={e => setFormData({...formData, outcome: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                  placeholder="What is the final decision or action plan?"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-navy-900 text-white rounded-2xl font-bold shadow-xl shadow-navy-100 hover:bg-navy-800 transition-all"
                >
                  Save Log
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all border border-slate-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
