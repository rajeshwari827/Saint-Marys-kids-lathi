import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { Users, GraduationCap, IndianRupee, Clock, QrCode, ReceiptText, LayoutDashboard, ChevronRight, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    totalFees: 0,
    pendingFees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const teachersSnap = await getDocs(collection(db, 'teachers'));
        const studentsSnap = await getDocs(collection(db, 'students'));
        const feesSnap = await getDocs(collection(db, 'fees'));

        const teacherCount = teachersSnap.size;
        const studentCount = studentsSnap.size;
        
        let collected = 0;
        feesSnap.forEach(doc => collected += doc.data().amount);

        // Calculate expected fees
        let expected = 0;
        studentsSnap.forEach(doc => {
          const data = doc.data();
          const std = data.standard;
          let basicFees = ['Nursery', 'LKG', 'UKG', 'Std 1', 'Std 2', 'Std 3', 'Std 4', 'Std 5'].includes(std) ? 4500 : 5000;
          
          if (data.feeType === 'Half') {
            basicFees = basicFees / 2;
          }
          
          expected += basicFees * 2; // Assuming 2 semesters
        });

        setStats({
          teachers: teacherCount,
          students: studentCount,
          totalFees: collected,
          pendingFees: expected - collected
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'multipleCollections');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { name: 'Total Teachers', value: stats.teachers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Total Students', value: stats.students, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Fees Collected', value: `₹${stats.totalFees}`, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Pending Fees', value: `₹${stats.pendingFees}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const quickAccess = [
    { name: 'Teacher Management', path: '/teachers', icon: Users, desc: 'Add teachers, manage subjects, generate QRs', color: 'bg-blue-500' },
    { name: 'Student Records', path: '/students', icon: GraduationCap, desc: 'Enroll students, class-wise lists, bulk upload', color: 'bg-purple-500' },
    { name: 'Attendance Logs', path: '/attendance', icon: QrCode, desc: 'View entry/exit times, filter by date', color: 'bg-orange-500' },
    { name: 'Fees Tracking', path: '/fees', icon: ReceiptText, desc: 'Collect fees, generate receipts, defaulter list', color: 'bg-emerald-500' },
    { name: 'QR Scanner', path: '/qr-scanner', icon: QrCode, desc: 'Live camera scanner for teacher attendance', color: 'bg-navy-700' },
    { name: 'Result Management', path: '/results', icon: GraduationCap, desc: 'Generate report cards, calculate marks & grades', color: 'bg-rose-500' },
    { name: 'Master Key', path: '/master-key', icon: Crown, desc: 'Principal override for national holidays & master attendance', color: 'bg-amber-500' },
  ];

  if (loading) return (
    <div className="flex animate-pulse space-x-4">
      <div className="flex-1 space-y-6 py-1">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 bg-slate-200 rounded col-span-1"></div>
            <div className="h-24 bg-slate-200 rounded col-span-1"></div>
            <div className="h-24 bg-slate-200 rounded col-span-1"></div>
            <div className="h-24 bg-slate-200 rounded col-span-1"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="space-y-12"
    >
      <header className="border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center bg-white shadow-xl ring-1 ring-slate-100 flex-shrink-0">
          <img 
            src="/schoollogo.jpeg" 
            alt="Saint Mary's Logo" 
            className="w-full h-full object-cover" 
          />
        </div>
        <div>
          <h1 className="text-4xl font-black text-navy-900 leading-tight">
            Saint Mary's Kids English Medium School
          </h1>
          <p className="text-slate-500 font-medium mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Lathi, Gujarat • School Management System
          </p>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-navy-900 border-l-4 border-navy-700 pl-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
            >
              <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.name}</p>
                <p className="text-2xl font-bold text-navy-900">{card.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold text-navy-900 border-l-4 border-navy-700 pl-4">Quick Navigation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {quickAccess.map((item, i) => (
            <Link key={item.path} to={item.path}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + (i * 0.05) }}
                whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-full group transition-all"
              >
                <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${item.color.split('-')[1]}-200`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-navy-900 mb-2 group-hover:text-navy-700 transition-colors">{item.name}</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">{item.desc}</p>
                <div className="flex items-center gap-2 text-sm font-bold text-navy-700">
                  Open Module <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
