/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { GraduationCap, ReceiptText, QrCode, Loader2, WifiOff, ArrowLeft, LayoutDashboard, Users, Crown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Modules
import Dashboard from './modules/Dashboard';
import Teachers from './modules/Teachers';
import Students from './modules/Students';
import Fees from './modules/Fees';
import Attendance from './modules/Attendance';
import QRScanner from './modules/QRScanner';
import Results from './modules/Results';
import MasterKey from './modules/MasterKey';
import PTMLogs from './modules/PTMLogs';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // No longer checking authentication or admin status
    setLoading(false);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 md:p-8">
          <AnimatePresence>
            {isOffline && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-700 font-medium shadow-sm"
              >
                <WifiOff className="w-5 h-5" />
                Working Offline. All changes will sync when connection is restored.
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/teachers" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <Teachers />
                </div>
              } />
              <Route path="/students" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <Students />
                </div>
              } />
              <Route path="/fees" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <Fees />
                </div>
              } />
              <Route path="/attendance" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <Attendance />
                </div>
              } />
              <Route path="/qr-scanner" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <QRScanner />
                </div>
              } />
              <Route path="/results" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <Results />
                </div>
              } />
              <Route path="/master-key" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <MasterKey />
                </div>
              } />
              <Route path="/ptm-logs" element={
                <div className="space-y-6">
                  <Link to="/" className="inline-flex items-center gap-2 text-navy-600 hover:text-navy-800 font-bold text-sm mb-2 group">
                    <div className="p-1.5 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-all">
                      <ArrowLeft className="w-4 h-4 text-navy-800" />
                    </div>
                    Back to Selection
                  </Link>
                  <PTMLogs />
                </div>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}

function Sidebar() {
  const location = useLocation();
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Teachers', path: '/teachers', icon: Users },
    { name: 'Students', path: '/students', icon: GraduationCap },
    { name: 'Attendance', path: '/attendance', icon: QrCode },
    { name: 'Fees', path: '/fees', icon: ReceiptText },
    { name: 'QR Scanner', path: '/qr-scanner', icon: QrCode },
    { name: 'Results', path: '/results', icon: LayoutDashboard },
    { name: 'PTM Logs', path: '/ptm-logs', icon: MessageSquare },
    { name: 'Master Key', path: '/master-key', icon: Crown },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-navy-800 text-white hidden lg:flex flex-col shadow-2xl z-50">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-sm ring-1 ring-white/20">
          <img 
            src="/schoollogo.jpeg" 
            alt="Saint Mary's Logo" 
            className="w-full h-full object-cover" 
          />
        </div>
        <span className="text-xl font-bold tracking-tight text-white/90">Saint Mary's</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-8">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-white text-navy-900 shadow-lg' 
                  : 'text-navy-300 hover:bg-navy-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto">
        <div className="px-4 py-2 text-xs font-bold text-navy-400 uppercase tracking-widest">
          Public Access Mode
        </div>
      </div>
    </aside>
  );
}
