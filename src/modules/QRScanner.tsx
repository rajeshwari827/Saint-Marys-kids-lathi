import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, User, CheckCircle2, AlertCircle, Clock, ArrowRight, ArrowLeft, Camera } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error', message: string, teacher?: any } | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          onScanError
        );
        setIsScanning(true);
      } catch (err) {
        console.error("Failed to start scanner", err);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, []);

  async function onScanSuccess(decodedText: string) {
    if (isProcessing.current || scanResult) return; 
    isProcessing.current = true;

    const MASTER_QR_DATA = "PRINCIPAL_MASTER_KEY_2026";
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const isSunday = now.getDay() === 0;

    try {
      // 1. Handle Master QR Code for National Holidays
      if (decodedText === MASTER_QR_DATA) {
        setScanResult({ status: 'success', message: 'Master QR Detected: Processing Holiday Attendance...' });
        
        try {
          const teachersSnap = await getDocs(collection(db, 'teachers'));
          const batchPromises = teachersSnap.docs.map(async (teacherDoc) => {
            const teacherId = teacherDoc.id;
            const attQ = query(
              collection(db, 'attendance'), 
              where('teacherId', '==', teacherId), 
              where('date', '==', today),
              limit(1)
            );
            const attSnap = await getDocs(attQ);
            
            if (attSnap.empty) {
              // Create full day attendance for holiday
              const entryDate = setMinutes(setHours(new Date(), 8), 0);
              const exitDate = setMinutes(setHours(new Date(), 14), 0);
              
              return addDoc(collection(db, 'attendance'), {
                teacherId,
                date: today,
                entryTime: entryDate,
                exitTime: exitDate,
                isHoliday: true,
                createdAt: serverTimestamp()
              });
            }
          });
          
          await Promise.all(batchPromises);
          
          setScanResult({ 
            status: 'success', 
            message: 'All staff marked present for National Holiday!' 
          });
          
          isProcessing.current = false;
          setTimeout(() => setScanResult(null), 5000);
          return;
        } catch (err) {
          console.error("Master scan error:", err);
          setScanResult({ status: 'error', message: 'Master scan failed. Check database logs.' });
          isProcessing.current = false;
          setTimeout(() => setScanResult(null), 3000);
          return;
        }
      }

      // Handle Sundays
      if (isSunday) {
        setScanResult({ status: 'error', message: 'It is Sunday! Full attendance is automatically granted for the weekly holiday.' });
        setTimeout(() => {
          setScanResult(null);
          isProcessing.current = false;
        }, 3000);
        return;
      }

      // 2. Find teacher with this QR Data
      const q = query(collection(db, 'teachers'), where('qrData', '==', decodedText), limit(1));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setScanResult({ status: 'error', message: 'Unauthorized QR Code detected.' });
        setTimeout(() => {
          setScanResult(null);
          isProcessing.current = false;
        }, 3000);
        return;
      }

      const teacher = { id: snap.docs[0].id, ...snap.docs[0].data() as any };
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();

      // 2. Check today's attendance for this teacher
      const attQ = query(
        collection(db, 'attendance'), 
        where('teacherId', '==', teacher.id), 
        where('date', '==', today),
        limit(1)
      );
      const attSnap = await getDocs(attQ);

      if (attSnap.empty) {
        // Mark ENTRY
        await addDoc(collection(db, 'attendance'), {
          teacherId: teacher.id,
          date: today,
          entryTime: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        setScanResult({ 
            status: 'success', 
            message: `Entry Marked: Welcome ${teacher.name}!`,
            teacher 
        });
      } else {
        const attendance = { id: attSnap.docs[0].id, ...attSnap.docs[0].data() as any };
        
        if (attendance.exitTime) {
          setScanResult({ status: 'error', message: 'You have already marked your exit for today.' });
        } else {
          // Check if it's before 2:00 PM
          if (now.getHours() >= 14) {
            setScanResult({ 
                status: 'error', 
                message: 'Exit can only be marked before 2:00 PM. Please contact admin.' 
            });
          } else {
            // Mark EXIT
            await updateDoc(doc(db, 'attendance', attendance.id), {
              exitTime: serverTimestamp()
            });
            setScanResult({ 
                status: 'success', 
                message: `Exit Marked: Goodbye ${teacher.name}!`,
                teacher 
            });
          }
        }
      }

      // Add to local recent scans
      setRecentScans(prev => [{ 
        teacherName: teacher.name, 
        time: new Date(), 
        type: attSnap.empty ? 'Entry' : 'Exit' 
      }, ...prev].slice(0, 5));

      setTimeout(() => {
        setScanResult(null);
        isProcessing.current = false;
      }, 3000);

    } catch (error) {
      console.error(error);
      setScanResult({ status: 'error', message: 'Server error. Please try again.' });
      setTimeout(() => {
        setScanResult(null);
        isProcessing.current = false;
      }, 3000);
    }
  }

  function onScanError(err: any) {
    // Too many logs if we console.error here
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="text-center">
        <div className="w-16 h-16 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-navy-200">
          <QrCode className="w-8 h-8 text-navy-700" />
        </div>
        <h1 className="text-4xl font-black text-navy-900 tracking-tight">Attendance Scanner</h1>
        <p className="text-slate-500 mt-2 font-medium">Scan teacher QR badge for entry/exit logging</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden aspect-square">
                <div id="reader" className="w-full h-full overflow-hidden rounded-[2rem] bg-slate-900"></div>
                
                {!isScanning && (
                  <div className="absolute inset-4 z-10 bg-white/80 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-navy-50 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                      <Camera className="w-8 h-8 text-navy-400" />
                    </div>
                    <p className="text-navy-900 font-bold uppercase tracking-widest text-xs">Accessing Camera...</p>
                  </div>
                )}
                
                <AnimatePresence>
                    {scanResult && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`absolute inset-4 z-20 rounded-[2rem] flex flex-col items-center justify-center text-center p-8 backdrop-blur-md ${
                                scanResult.status === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'
                            }`}
                        >
                            {scanResult.status === 'success' ? (
                                <CheckCircle2 className="w-20 h-20 text-white mb-4 animate-bounce" />
                            ) : (
                                <AlertCircle className="w-20 h-20 text-white mb-4 animate-shake" />
                            )}
                            <h2 className="text-2xl font-bold text-white mb-2">{scanResult.status === 'success' ? 'Verified' : 'Error'}</h2>
                            <p className="text-white font-medium text-lg leading-tight">{scanResult.message}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="bg-navy-900 p-8 rounded-3xl text-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-navy-400" />
                    Scanning Rules
                </h3>
                <ul className="space-y-3 text-sm text-navy-300">
                    <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-navy-800 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                        First scan marks your <span className="text-emerald-400 font-bold">ENTRY</span> time.
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-navy-800 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                        Second scan marks your <span className="text-blue-400 font-bold">EXIT</span> time.
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-navy-800 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                        Exits are only allowed <span className="text-white font-bold">BEFORE 2:00 PM</span>.
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-navy-800 rounded flex items-center justify-center text-[10px] font-bold mt-0.5">4</div>
                        Maximum <span className="text-white font-bold">2 scans</span> allowed per working day.
                    </li>
                </ul>
            </div>
        </div>

        <div className="space-y-6">
            <h3 className="text-xl font-black text-navy-900 px-2 tracking-tight">Recent Scans Today</h3>
            <div className="space-y-3">
                {recentScans.length > 0 ? (
                    recentScans.map((scan, i) => (
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={i} 
                            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    scan.type === 'Entry' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                    {scan.type === 'Entry' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-bold text-navy-900">{scan.teacherName}</p>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">{scan.type} marked</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-black text-navy-700">{format(scan.time, 'hh:mm a')}</p>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                        <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm font-bold">Waiting for scans...</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
