import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Printer, Info, Crown } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function MasterKey() {
  const MASTER_QR_DATA = "PRINCIPAL_MASTER_KEY_2026";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy-900 flex items-center gap-3">
            <Crown className="w-8 h-8 text-amber-500" />
            Principal's Master Key
          </h1>
          <p className="text-slate-500 font-medium">Manage institutional override and holiday attendance</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-navy-900 text-white rounded-xl font-bold hover:bg-navy-800 transition-all shadow-xl no-print"
        >
          <Printer className="w-5 h-5" />
          Print Master Card
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-amber-100 flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 z-0" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-navy-50 rounded-full -ml-16 -mb-16 z-0" />

            <div className="relative z-10 w-full">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Crown className="w-6 h-6 text-amber-500" />
                <span className="text-[10px] font-black text-navy-900 uppercase tracking-[0.3em]">Saint Mary's School</span>
              </div>

              <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 inline-block mb-6">
                <QRCode value={MASTER_QR_DATA} size={180} />
              </div>

              <h2 className="text-xl font-black text-navy-900 uppercase tracking-tight mb-1">Principal Master Card</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Security Access Level: 5</p>
              
              <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full" />
            </div>
          </motion.div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <ShieldCheck className="w-12 h-12 text-emerald-100" />
            </div>
            
            <h3 className="text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-navy-400" />
              Master Key Capabilities
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-navy-900 uppercase tracking-widest mb-2 text-emerald-600">National Holidays</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Scanning this QR on national holidays marks <strong>all faculty and staff</strong> present for a full day auto-shift.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-navy-900 uppercase tracking-widest mb-2 text-amber-600">Institutional Override</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Authorized presence marker for administrative requirements and surprise inspections.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-navy-900 uppercase tracking-widest mb-2 text-blue-600">Sunday Auto-Pass</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  System automatically identifies and clears weekly holidays without physical scanning required.
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-black text-navy-900 uppercase tracking-widest mb-2 text-navy-600">Security Note</p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Keep this card secure. Use <strong>only</strong> for authorized collective attendance marking.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-900 p-8 rounded-[2rem] text-white">
            <h4 className="font-bold flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              Operational Protocol
            </h4>
            <p className="text-amber-100/70 text-sm leading-relaxed">
              When a National Holiday is declared, the Principal must scan this QR code once at the main scanner terminal. The system will process full-day logs for all registered teaching and non-teaching staff in the centralized database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
