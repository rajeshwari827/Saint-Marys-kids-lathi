import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Plus, Trash2, Edit2, QrCode as QrIcon, Search, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';

export default function Teachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    subject: ''
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  async function fetchTeachers() {
    try {
      const snap = await getDocs(collection(db, 'teachers'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeachers(list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'teachers');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedTeacher) {
        // Edit
        await updateDoc(doc(db, 'teachers', selectedTeacher.id), {
          ...formData,
          age: Number(formData.age)
        });
      } else {
        // Add
        const qrData = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await addDoc(collection(db, 'teachers'), {
          ...formData,
          age: Number(formData.age),
          qrData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setFormData({ name: '', age: '', subject: '' });
      setSelectedTeacher(null);
      fetchTeachers();
    } catch (error) {
      handleFirestoreError(error, selectedTeacher ? OperationType.UPDATE : OperationType.CREATE, `teachers/${selectedTeacher?.id || 'new'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Permanently delete this teacher?')) {
      try {
        await deleteDoc(doc(db, 'teachers', id));
        fetchTeachers();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `teachers/${id}`);
      }
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Teachers</h1>
          <p className="text-slate-500">Manage school faculty and attendance QRs</p>
        </div>
        <button
          onClick={() => {
            setSelectedTeacher(null);
            setFormData({ name: '', age: '', subject: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-navy-700 text-white rounded-xl font-semibold hover:bg-navy-800 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">QR Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-navy-900">{teacher.name}</td>
                  <td className="px-6 py-4 text-slate-500">{teacher.age}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-navy-50 text-navy-700 rounded-full text-sm font-medium">
                      {teacher.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setIsQRModalOpen(true);
                      }}
                      className="text-navy-600 hover:text-navy-800 flex items-center gap-1 transition-colors"
                    >
                      <QrIcon className="w-4 h-4" />
                      View QR
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button 
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setFormData({ name: teacher.name, age: teacher.age.toString(), subject: teacher.subject });
                        setIsModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(teacher.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTeachers.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-400">
              No teachers found. Click "Add Teacher" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Teacher Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-navy-900">{selectedTeacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Age</label>
                    <input
                      required
                      type="number"
                      value={formData.age}
                      onChange={e => setFormData({...formData, age: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      required
                      type="text"
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-navy-700 text-white rounded-xl font-bold hover:bg-navy-800 transition-all shadow-md mt-4"
                >
                  {selectedTeacher ? 'Update Teacher' : 'Save Teacher'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQRModalOpen && selectedTeacher && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm"
            >
              <h2 className="text-2xl font-bold text-navy-900 mb-2">{selectedTeacher.name}</h2>
              <p className="text-slate-500 mb-6 text-sm">Unique Identification QR for Attendance</p>
              
              <div className="bg-slate-50 p-6 rounded-2xl flex justify-center mb-6">
                <QRCode value={selectedTeacher.qrData} size={200} />
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 py-3 bg-navy-700 text-white rounded-xl font-bold hover:bg-navy-800"
                >
                  <Download className="w-5 h-5" />
                  Print QR Badge
                </button>
                <button 
                  onClick={() => setIsQRModalOpen(false)}
                  className="py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
