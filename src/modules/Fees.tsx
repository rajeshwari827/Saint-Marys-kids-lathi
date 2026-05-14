import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Plus, Search, ReceiptText, Printer, CheckCircle2, AlertCircle, X, GraduationCap, Building2, RotateCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Fees() {
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isNewTransaction, setIsNewTransaction] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unpaid'>('all');
  const [archiving, setArchiving] = useState(false);

  const [formData, setFormData] = useState({
    studentId: '',
    semester: 'First',
    paymentMode: 'UPI',
    receiptNo: '',
    date: new Date().toISOString().split('T')[0]
  });

  const standards = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5', 'Std 6', 'Std 7', 'Std 8'];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const studsSnap = await getDocs(collection(db, 'students'));
      const feesSnap = await getDocs(collection(db, 'fees'));
      
      const stList = studsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const feList = feesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setStudents(stList);
      setFees(feList);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students/fees');
    } finally {
      setLoading(false);
    }
  }

  const getFeesStatus = (student: any) => {
    const studentFees = fees.filter(f => f.studentId === student.id);
    const paidSemesters = studentFees.map(f => f.semester);
    const totalPaid = studentFees.reduce((acc, f) => acc + f.amount, 0);
    
    let baseSemFee = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5'].includes(student.standard) ? 4500 : 5000;
    
    if (student.feeType === 'Half') {
      baseSemFee = baseSemFee / 2;
    }
    
    const totalExpected = baseSemFee * 2;
    
    return {
      status: paidSemesters.length >= 2 ? 'Fully Paid' : paidSemesters.length === 1 ? 'Partially Paid' : 'Unpaid',
      totalPaid,
      totalExpected,
      pending: totalExpected - totalPaid,
      paidSemesters
    };
  };

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentId) return;

    const student = students.find(s => s.id === formData.studentId);
    if (!student) return;

    const lowerClasses = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5'];
    let amount = lowerClasses.includes(student.standard) ? 4500 : 5000;
    
    if (student.feeType === 'Half') {
      amount = amount / 2;
    }

    // Step 1: Prepare the receipt data for preview (Do NOT save to DB yet)
    const receiptData = {
      ...formData,
      amount,
      feeType: student.feeType || 'Full',
      studentName: student.name,
      standard: student.standard,
      grNumber: student.grNumber,
      academicYear: '2025-26'
    };
    
    setIsNewTransaction(true);
    setSelectedReceipt(receiptData);
    setIsModalOpen(false);
    setIsReceiptOpen(true);
  };

  const handleFinalizeAndPrint = async () => {
    if (!selectedReceipt || isSaving) return;
    
    setIsSaving(true);
    try {
      // Step 2: Save to DB only when user confirms and prints
      const { studentName, standard, grNumber, ...dbData } = selectedReceipt;
      
      const res = await addDoc(collection(db, 'fees'), {
        ...dbData,
        createdAt: serverTimestamp(),
      });

      // Update local receipt with the generated ID
      setSelectedReceipt({ ...selectedReceipt, id: res.id });
      
      // Trigger browser print
      setTimeout(() => {
        window.print();
        setIsSaving(false);
        setIsNewTransaction(false);
        setIsReceiptOpen(false);
        fetchData();
      }, 100);

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'fees');
      setIsSaving(false);
    }
  };

  const archiveAcademicYear = async () => {
    if (!window.confirm('Are you sure you want to COMPLETE the Academic Year? \n\nThis will: \n1. Move all current fees to backup. \n2. CLEAR current fees for the new session. \n3. Overwrite any old backup older than 1 year. \n\nIMPORTANT: Student details and progress records will NOT be deleted. \n\nThis action cannot be undone!')) return;
    
    setArchiving(true);
    try {
      const currentFeesSnap = await getDocs(collection(db, 'fees'));
      const backupSnap = await getDocs(collection(db, 'fees_backup'));
      
      let batch = writeBatch(db);
      let count = 0;
      const BATCH_SIZE = 400; // Safe margin below 500

      // Delete existing backup (keeping only one previous year)
      for (const d of backupSnap.docs) {
        batch.delete(doc(db, 'fees_backup', d.id));
        count++;
        if (count >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      // Copy current to backup and delete from current
      for (const d of currentFeesSnap.docs) {
        const data = d.data();
        const backupRef = doc(collection(db, 'fees_backup'));
        
        batch.set(backupRef, { ...data, archivedAt: serverTimestamp() });
        count++;
        
        batch.delete(doc(db, 'fees', d.id));
        count++;

        if (count >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      alert('Academic Year completed successfully! Current records have been moved to backup.');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'fees/archive');
    } finally {
      setArchiving(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.grNumber.includes(searchTerm);
    if (filter === 'unpaid') {
      return matchesSearch && getFeesStatus(s).status !== 'Fully Paid';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Fees Management</h1>
          <p className="text-slate-500">Track collections and generate receipts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={archiveAcademicYear}
            disabled={archiving}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 border-2 border-red-100 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50"
          >
            {archiving ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
            End Session
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-navy-700 text-white rounded-xl font-semibold hover:bg-navy-800 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Collect Fees
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search student records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
          />
        </div>
        <div className="bg-slate-100 p-1.5 rounded-2xl flex">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
          >
            All Students
          </button>
          <button 
            onClick={() => setFilter('unpaid')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'unpaid' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-navy-900'}`}
          >
            Defaulters Only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
        {filteredStudents.map(student => {
          const stats = getFeesStatus(student);
          return (
            <motion.div 
              layout
              key={student.id}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  stats.status === 'Fully Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                  stats.status === 'Partially Paid' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                  'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {stats.status}
                </div>
                <p className="text-navy-400 font-bold text-xs">STD {student.standard.split(' ')[1] || student.standard}</p>
              </div>

              <h3 className="text-xl font-bold text-navy-900 mb-1">{student.name}</h3>
              <p className="text-slate-400 text-xs font-semibold mb-6 tracking-wide">GR NO. {student.grNumber}</p>

              <div className="space-y-4 mb-6 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Expected</span>
                  <span className="text-navy-900 font-bold">₹{stats.totalExpected}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Collected</span>
                  <span className="text-emerald-600 font-bold">₹{stats.totalPaid}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${stats.status === 'Fully Paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${(stats.totalPaid / stats.totalExpected) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={stats.status === 'Fully Paid'}
                  onClick={() => {
                    setFormData({...formData, studentId: student.id});
                    setIsModalOpen(true);
                  }}
                  className="flex-1 py-3 bg-navy-50 text-navy-700 rounded-xl font-bold text-sm hover:bg-navy-100 transition-all disabled:opacity-30"
                >
                  Collect
                </button>
                <button
                  onClick={() => {
                    const studentFee = fees.find(f => f.studentId === student.id);
                    if (studentFee) {
                       const receiptDate = typeof studentFee.date === 'string' 
                         ? studentFee.date 
                         : studentFee.date?.toDate?.() 
                           ? studentFee.date.toDate().toLocaleDateString('en-IN')
                           : 'N/A';
                           
                       setSelectedReceipt({
                         ...studentFee,
                         studentName: student.name,
                         standard: student.standard,
                         grNumber: student.grNumber,
                         date: receiptDate
                       });
                       setIsReceiptOpen(true);
                    }
                  }}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-slate-100"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Collect Fee Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-navy-900">Add Fees Receipt</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
              </div>
              <form onSubmit={handleAddFee} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
                  <select 
                    required 
                    value={formData.studentId} 
                    onChange={e => setFormData({...formData, studentId: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 appearance-none font-medium"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.standard})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Receipt Number</label>
                    <input 
                      required 
                      type="text"
                      placeholder="e.g. 1025"
                      value={formData.receiptNo} 
                      onChange={e => setFormData({...formData, receiptNo: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Receipt Date</label>
                    <input 
                      required 
                      type="date"
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 font-medium"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Semester</label>
                    <select 
                      required 
                      value={formData.semester} 
                      onChange={e => setFormData({...formData, semester: e.target.value as any})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 appearance-none font-medium"
                    >
                      <option value="First">First Semester</option>
                      <option value="Second">Second Semester</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Payment Mode</label>
                    <select 
                      required 
                      value={formData.paymentMode} 
                      onChange={e => setFormData({...formData, paymentMode: e.target.value as any})}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-500 appearance-none font-medium"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Online">Online</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
                
                {formData.studentId && (
                  <div className="bg-navy-50 p-6 rounded-2xl">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-navy-400 text-xs font-bold uppercase tracking-widest">Calculated Tuition Fee</p>
                      {students.find(s => s.id === formData.studentId)?.feeType === 'Half' && (
                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">Half Facility</span>
                      )}
                    </div>
                    <p className="text-3xl font-black text-navy-900">
                      ₹{(() => {
                        const s = students.find(s => s.id === formData.studentId);
                        let amt = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5'].includes(s?.standard) ? 4500 : 5000;
                        if (s?.feeType === 'Half') amt = amt / 2;
                        return amt;
                      })()}
                    </p>
                  </div>
                )}

                <button type="submit" className="w-full py-4 bg-navy-700 text-white rounded-2xl font-bold text-lg hover:bg-navy-800 transition-all shadow-xl shadow-navy-100">
                  Generate Receipt
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Printable Modal */}
      <AnimatePresence>
        {isReceiptOpen && selectedReceipt && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-md overflow-y-auto">
             <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-white rounded-xl max-w-6xl w-full shadow-2xl overflow-hidden my-8"
             >
                <div className="receipt-print bg-white grid grid-cols-1 xl:grid-cols-2 divide-y-2 xl:divide-y-0 xl:divide-x-2 print:divide-y-0 print:divide-x-2 divide-dashed divide-slate-300">
                  {/* Reuseable Receipt Template */}
                  {['STUDENT COPY', 'ADMIN COPY'].map((copyType) => (
                    <div key={copyType} className="p-8 print:p-8 relative bg-white overflow-hidden flex flex-col h-full">
                      {/* Receipt Header */}
                      <div className="flex flex-col items-center mb-8 relative z-10 border-b-2 border-navy-900 pb-6">
                        <div className="w-full flex items-center mb-6">
                          <div className="w-16 h-16 shrink-0 overflow-hidden rounded-lg">
                            <img 
                              src="/schoollogo.jpeg" 
                              alt="School Logo" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                           <div className="flex-1 text-center">
                              <h2 className="text-3xl font-black text-navy-900 uppercase leading-none">Saint Mary's Kids Lathi</h2>
                              <p className="text-sm font-semibold text-navy-700 tracking-[0.15em] uppercase mt-1">English Medium School</p>
                              <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tighter">
                                Lathi, Dist: Amreli, Gujarat • Ph: 8200862010, 9426156167
                              </p>
                           </div>
                        </div>
                        
                        <div className="w-full flex justify-between items-center bg-navy-50 px-4 py-2 rounded border border-navy-100">
                           <div className="flex gap-4 text-[9px] font-black text-navy-400 uppercase tracking-widest">
                             <span>No: <span className="text-navy-900">#{selectedReceipt.receiptNo || (selectedReceipt.id ? selectedReceipt.id.slice(-6).toUpperCase() : 'NEW')}</span></span>
                             <span>Date: <span className="text-navy-900">{
                               selectedReceipt.date?.includes?.('-') 
                                 ? selectedReceipt.date.split('-').reverse().join('/') 
                                 : selectedReceipt.date
                             }</span></span>
                           </div>
                           <div className="px-3 py-0.5 bg-navy-900 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-sm">
                             {copyType}
                           </div>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 relative z-10 px-2 text-sm text-left">
                        <div className="border-b border-slate-100 flex flex-col pb-1">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">Student Name</span>
                            <span className="font-bold text-navy-900 truncate">{selectedReceipt.studentName}</span>
                        </div>
                        <div className="border-b border-slate-100 flex flex-col pb-1">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">Standard / Class</span>
                            <span className="font-bold text-navy-900">{selectedReceipt.standard}</span>
                        </div>
                        <div className="border-b border-slate-100 flex flex-col pb-1">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">GR Number</span>
                            <span className="font-bold text-navy-900">{selectedReceipt.grNumber || 'N/A'}</span>
                        </div>
                        <div className="border-b border-slate-100 flex flex-col pb-1">
                            <span className="text-slate-400 uppercase text-[8px] font-bold tracking-wider">Payment Mode</span>
                            <span className="font-bold text-navy-900">{selectedReceipt.paymentMode}</span>
                        </div>
                      </div>

                      {/* Professional Simplified Fee Table */}
                      <div className="relative z-10 mb-8 border border-slate-200 rounded overflow-hidden flex-1">
                        <table className="w-full h-full border-collapse">
                          <thead>
                            <tr className="bg-navy-900 text-white text-[9px] uppercase font-black">
                              <th className="px-4 py-2 text-left w-12">S.No</th>
                              <th className="px-4 py-2 text-left border-l border-white/10">Fee Description</th>
                              <th className="px-4 py-2 text-right border-l border-white/10 w-24">Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            <tr className="border-b border-slate-50">
                              <td className="px-4 py-4 text-xs font-bold text-slate-300 align-top">01</td>
                              <td className="px-4 py-4 border-l border-slate-50 text-left align-top">
                                <p className="font-bold text-navy-900">Tuition Fees {selectedReceipt.feeType === 'Half' ? '(Half Facility)' : ''}</p>
                                <p className="text-[8px] text-slate-400 font-medium uppercase mt-0.5">{selectedReceipt.semester} Installment</p>
                              </td>
                              <td className="px-4 py-4 border-l border-slate-50 text-right font-black text-navy-900 align-top">
                                {selectedReceipt.amount}.00
                              </td>
                            </tr>
                            {/* Empty space filler */}
                            <tr className="h-full">
                                <td className="px-4 py-4"></td>
                                <td className="px-4 py-4 border-l border-slate-50"></td>
                                <td className="px-4 py-4 border-l border-slate-50 text-right"></td>
                            </tr>
                          </tbody>
                          <tfoot>
                            <tr className="bg-navy-50 font-black border-t border-slate-200">
                              <td colSpan={2} className="px-4 py-3 text-right text-[9px] uppercase text-navy-400 tracking-widest leading-none align-middle">Total Net Amount</td>
                              <td className="px-4 py-3 text-right text-xl text-navy-900 border-l border-slate-200 leading-none">₹{selectedReceipt.amount}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Footer Section */}
                      <div className="flex justify-between items-end mt-4 px-4 pb-4">
                        <div className="text-center">
                            <div className="w-24 h-12 border border-dashed border-slate-200 rounded flex items-center justify-center mb-2">
                               <Building2 className="w-5 h-5 text-slate-100" />
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-navy-700">School Stamp</p>
                        </div>
                        <div className="text-center">
                            <div className="w-40 h-10 border-b border-navy-900 mb-2 font-serif italic text-[10px] text-slate-200 flex items-end justify-center">
                               Principal Signature
                            </div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-navy-700">Authorized Signatory</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-slate-50 flex gap-4 no-print border-t border-slate-200">
                   {isNewTransaction ? (
                     <button 
                       onClick={handleFinalizeAndPrint}
                       disabled={isSaving}
                       className="flex-1 flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-100 disabled:opacity-50"
                     >
                       {isSaving ? (
                         <>
                           <Loader2 className="w-5 h-5 animate-spin" />
                           Finalizing...
                         </>
                       ) : (
                         <>
                           <CheckCircle2 className="w-5 h-5" />
                           Confirm, Save & Print
                         </>
                       )}
                     </button>
                   ) : (
                     <button 
                       onClick={() => window.print()}
                       className="flex-1 flex items-center justify-center gap-3 py-4 bg-navy-800 text-white rounded-xl font-bold hover:bg-navy-900 shadow-xl"
                     >
                       <Printer className="w-5 h-5" />
                       Reprint Receipt
                     </button>
                   )}
                   <button 
                     onClick={() => {
                       setIsReceiptOpen(false);
                       setIsNewTransaction(false);
                     }}
                     className="px-8 py-4 bg-white text-slate-500 rounded-xl font-bold hover:bg-slate-100 border border-slate-200"
                   >
                     Close
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden; }
          .receipt-print, .receipt-print * { visibility: visible; }
          .receipt-print { position: fixed; left: 0; top: 0; width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 1fr; }
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
