import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Plus, Trash2, Edit2, Search, X, FileUp, ChevronRight, GraduationCap, TrendingUp, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

export default function Students() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    grNumber: '',
    fatherName: '',
    motherName: '',
    address: '',
    age: '',
    placeOfBirth: '',
    dateOfBirth: '',
    standard: 'Std 1',
    feeType: 'Full'
  });

  const standards = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5', 'Std 6', 'Std 7', 'Std 8'];
  const feeTypes = ['Full', 'Half'];

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const snap = await getDocs(collection(db, 'students'));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(list);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students');
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        age: Number(formData.age)
      };

      if (selectedStudent) {
        await updateDoc(doc(db, 'students', selectedStudent.id), dataToSave);
      } else {
        await addDoc(collection(db, 'students'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, selectedStudent ? OperationType.UPDATE : OperationType.CREATE, `students/${selectedStudent?.id || 'new'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      grNumber: '',
      fatherName: '',
      motherName: '',
      address: '',
      age: '',
      placeOfBirth: '',
      dateOfBirth: '',
      standard: 'Std 1',
      feeType: 'Full'
    });
    setSelectedStudent(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Permanently delete this student record?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
        fetchStudents();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
      }
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const batch = writeBatch(db);
        const studentsCol = collection(db, 'students');

        data.forEach(item => {
          const newDoc = doc(studentsCol);
          batch.set(newDoc, {
            name: item.Name || item.name || '',
            grNumber: String(item['GR Number'] || item.grNumber || ''),
            fatherName: item['Father Name'] || item.fatherName || '',
            motherName: item['Mother Name'] || item.motherName || '',
            address: item.Address || item.address || '',
            age: Number(item.Age || item.age || 0),
            placeOfBirth: item['Place of Birth'] || item.placeOfBirth || '',
            dateOfBirth: String(item['Date of Birth'] || item.dateOfBirth || ''),
            standard: item.Standard || item.standard || 'Std 1',
            feeType: item['Fee Type'] || item.feeType || 'Full',
            createdAt: serverTimestamp()
          });
        });

        await batch.commit();
        alert(`Successfully imported ${data.length} students!`);
        fetchStudents();
      } catch (error) {
        console.error(error);
        alert('Error parsing Excel file. Please ensure columns match standard student headers.');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAutoPromotion = async () => {
    const confirmMsg = "Are you sure you want to promote ALL students to the next class? \n\n" +
                      "This will: \n" +
                      "1. Move Nursery to LKG \n" +
                      "2. Move Std 7 to Std 8 \n" +
                      "3. Move Std 8 to 'Alumni' \n\n" +
                      "THIS ACTION IS MASSIVE AND PERMANENT.";
    
    if (!window.confirm(confirmMsg)) return;

    setPromoting(true);
    try {
      const batch = writeBatch(db);
      students.forEach(student => {
        const currentIndex = standards.indexOf(student.standard);
        let nextStandard = '';
        
        if (currentIndex === -1) return; // Unknown standard

        if (currentIndex < standards.length - 1) {
          nextStandard = standards[currentIndex + 1];
        } else {
          nextStandard = 'Alumni';
        }

        if (nextStandard) {
          const studentRef = doc(db, 'students', student.id);
          batch.update(studentRef, { standard: nextStandard });
        }
      });

      await batch.commit();
      alert('Congratulations! All students have been promoted to the next academic level.');
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'students/bulk-promotion');
    } finally {
      setPromoting(false);
    }
  };

  const groupedStudents = standards.reduce((acc, std) => {
    const list = students.filter(s => s.standard === std && 
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.grNumber.includes(searchTerm))
    );
    if (list.length > 0) acc[std] = list;
    return acc;
  }, {} as any);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Students</h1>
          <p className="text-slate-500">Student enrollment and records management</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
            <FileUp className="w-5 h-5" />
            {uploading ? 'Importing...' : 'Bulk Import'}
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} disabled={uploading} />
          </label>
          <button
            onClick={handleAutoPromotion}
            disabled={promoting}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all shadow-lg disabled:opacity-50"
          >
            {promoting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
            Auto Promote
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-navy-700 text-white rounded-xl font-semibold hover:bg-navy-800 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search students by name or GR number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
          />
        </div>
      </div>

      <div className="space-y-8 pb-12">
        {standards.map(std => groupedStudents[std] && (
          <div key={std} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <ChevronRight className="w-5 h-5 text-navy-500" />
              <h2 className="text-xl font-bold text-navy-900">{std}</h2>
              <span className="bg-navy-50 text-navy-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                {groupedStudents[std].length} Students
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupedStudents[std].map((student: any) => (
                <motion.div
                  layout
                  key={student.id}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-navy-700" />
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setSelectedStudent(student);
                          setFormData({ 
                            ...student, 
                            age: student.age.toString(),
                            createdAt: undefined // Don't put in form
                          });
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-lg text-navy-900 leading-tight">{student.name}</h3>
                    {student.feeType === 'Half' && (
                      <div className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase tracking-widest border border-amber-100">
                        Half Fee
                      </div>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm mb-4 tracking-wide font-medium">GR: {student.grNumber}</p>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Father</p>
                      <p className="text-navy-700 font-medium truncate">{student.fatherName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Mother</p>
                      <p className="text-navy-700 font-medium truncate">{student.motherName}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(groupedStudents).length === 0 && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-400">
            No students found in the current view.
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-navy-900">{selectedStudent ? 'Edit Student Details' : 'Enroll New Student'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Student Full Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">GR Number</label>
                    <input required type="text" value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Standard (Class)</label>
                    <select value={formData.standard} onChange={e => setFormData({...formData, standard: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium appearance-none">
                      {standards.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Fee Facility</label>
                    <select value={formData.feeType} onChange={e => setFormData({...formData, feeType: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium appearance-none">
                      {feeTypes.map(f => <option key={f} value={f}>{f} Fee</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Father's Name</label>
                    <input required type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Mother's Name</label>
                    <input required type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Residential Address</label>
                    <textarea rows={2} required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Date of Birth</label>
                    <input required type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Place of Birth</label>
                    <input required type="text" value={formData.placeOfBirth} onChange={e => setFormData({...formData, placeOfBirth: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 transition-all font-medium" />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-navy-700 text-white rounded-2xl font-bold text-lg hover:bg-navy-800 transition-all shadow-xl shadow-navy-200 active:scale-[0.98] mt-4">
                  {selectedStudent ? 'Update Records' : 'Enroll Student'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
