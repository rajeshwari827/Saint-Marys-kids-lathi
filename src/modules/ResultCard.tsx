import React from 'react';
import { Student, Result, StudentStandard } from '../types';
import { SUBJECTS_CONFIG } from '../constants/subjects';
import { calculateMark, calculateResultTotals } from '../lib/resultUtils';

interface ResultCardProps {
  student: Student;
  result: Result;
  selectedSemester: 1 | 2;
}

const ResultCard: React.FC<ResultCardProps> = ({ student, result, selectedSemester }) => {
  const subjects = SUBJECTS_CONFIG[student.standard] || [];
  const sem1Stats = calculateResultTotals(result.semester1, student.standard, subjects);
  const sem2Stats = calculateResultTotals(result.semester2, student.standard, subjects);
  
  const isSem2 = selectedSemester === 2;
  
  const grandTotal = isSem2 ? (sem1Stats.obtained + sem2Stats.obtained) : sem1Stats.obtained;
  const maxGrandTotal = isSem2 ? (sem1Stats.total + sem2Stats.total) : sem1Stats.total;
  const overallPercentage = maxGrandTotal > 0 ? (grandTotal / maxGrandTotal) * 100 : 0;
  const finalGrade = isSem2 ? sem2Stats.grade : sem1Stats.grade;

  // Kindergarten check
  const isKindergarten = [StudentStandard.NURSERY, StudentStandard.LKG, StudentStandard.UKG].includes(student.standard);

  return (
    <div className="bg-white p-8 md:p-12 shadow-2xl rounded-[2.5rem] border border-slate-100 max-w-5xl mx-auto print:shadow-none print:p-0 print:border-0 print:m-0 print:rounded-none report-card">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-navy-900 pb-8 mb-8 relative">
        <div className="w-24 h-24 shrink-0 overflow-hidden rounded-2xl bg-slate-50 relative z-10">
          <img src="/schoollogo.jpeg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 text-center px-4 relative z-10">
          <h3 className="text-navy-700 font-bold tracking-widest text-xs uppercase mb-1">Shree Rajeshwari Educational Trust Lathi</h3>
          <h1 className="text-4xl font-black text-navy-900 uppercase leading-none mb-1">Saint Mary's Kids</h1>
          <h2 className="text-xl font-bold text-navy-800 uppercase tracking-[0.2em] mb-2 font-serif italic">English Medium School</h2>
          <p className="text-[10px] text-slate-500 font-medium max-w-lg mx-auto">
            BEELSHWAR PARK, LATHI-365430, MO-9426156167, 8200862010
          </p>
        </div>

        <div className="w-24 h-24 shrink-0 opacity-0"></div> {/* Spacer for symmetry */}
      </div>

      <div className="text-center mb-10">
        <h4 className="inline-block border-2 border-double border-navy-900 px-6 py-1.5 font-black uppercase text-sm tracking-[0.3em] text-navy-900 bg-navy-50">
          COMPREHENSIVE STATEMENT OF MARKS - {result.academicYear}
        </h4>
        <div className="text-[11px] font-bold text-navy-700 mt-1 uppercase tracking-widest italic">
          {isSem2 ? 'ANNUAL RESULT (Cumulative)' : 'FIRST SEMESTER RESULT'}
        </div>
      </div>

      {/* Student Info */}
      <div className="border-2 border-navy-900 mb-8 divide-y-2 divide-navy-900 bg-slate-50/50">
        <div className="p-4 text-center">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Name of the Student</span>
          <span className="text-2xl font-black text-navy-900 uppercase">{student.name}</span>
        </div>
        <div className="grid grid-cols-3 divide-x-2 divide-navy-900">
          <div className="p-3 text-center">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">G.R. No</span>
            <span className="text-lg font-black text-navy-900 leading-none">{student.grNumber}</span>
          </div>
          <div className="p-3 text-center">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll No</span>
            <span className="text-lg font-black text-navy-900 leading-none">{result.rollNo || '-'}</span>
          </div>
          <div className="p-3 text-center">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Class / Standard</span>
            <span className="text-lg font-black text-navy-900 leading-none">{student.standard}</span>
          </div>
        </div>
      </div>

      {/* Marks Table */}
      <div className="border-2 border-navy-900 overflow-hidden mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-navy-900 text-white text-[10px] uppercase font-black tracking-widest h-12 text-center">
              <th className="border-r border-navy-700 w-48 text-left px-4" rowSpan={2}>Subject</th>
              {!isKindergarten ? (
                <>
                  <th className={`border-r border-navy-700 ${!isSem2 ? 'bg-navy-800' : ''}`} colSpan={5}>Semester - 1</th>
                  {isSem2 && <th className="border-r border-navy-700" colSpan={5}>Semester - 2</th>}
                </>
              ) : (
                <>
                  <th className="border-r border-navy-700">Semester 1</th>
                  {isSem2 && <th className="border-r border-navy-700">Semester 2</th>}
                </>
              )}
              <th rowSpan={2} className="px-2">{isSem2 ? 'Grand Total' : 'Total'}</th>
            </tr>
            <tr className="bg-navy-800 text-white text-[9px] uppercase font-bold tracking-wide h-10 text-center">
              {!isKindergarten ? (
                <>
                  <th className="border-r border-navy-700 px-1">FA 1/2</th>
                  <th className="border-r border-navy-700 px-1">SA 1</th>
                  <th className="border-r border-navy-700 px-1">INTER</th>
                  <th className="border-r border-navy-700 px-1 bg-navy-700/30">TOTAL</th>
                  <th className="border-r border-navy-700 px-1">GRD</th>
                  {isSem2 && (
                    <>
                      <th className="border-r border-navy-700 px-1">FA 3/4</th>
                      <th className="border-r border-navy-700 px-1">SA 2</th>
                      <th className="border-r border-navy-700 px-1">INTER</th>
                      <th className="border-r border-navy-700 px-1 bg-navy-700/30">TOTAL</th>
                      <th className="border-r border-navy-700 px-1">GRD</th>
                    </>
                  )}
                </>
              ) : (
                <>
                  <th className="border-r border-navy-700">Obtained (100)</th>
                  {isSem2 && <th className="border-r border-navy-700">Obtained (100)</th>}
                </>
              )}
            </tr>
          </thead>
          <tbody className="text-[11px] font-bold text-navy-900 uppercase">
            {subjects.map(sub => {
              const m1 = result.semester1[sub.id] || {};
              const m2 = result.semester2[sub.id] || {};
              const t1 = calculateMark(m1, student.standard);
              const t2 = calculateMark(m2, student.standard);
              
              const sa1Disp = [StudentStandard.STD6, StudentStandard.STD7, StudentStandard.STD8].includes(student.standard) ? (m1.sa1 ? m1.sa1/2 : 0) : (m1.sa1 || 0);
              const sa2Disp = [StudentStandard.STD6, StudentStandard.STD7, StudentStandard.STD8].includes(student.standard) ? (m2.sa1 ? m2.sa1/2 : 0) : (m2.sa1 || 0);

              return (
                <tr key={sub.id} className="border-t border-navy-900 h-10 divide-x divide-navy-900">
                  <td className="px-4 font-black">{sub.name}</td>
                  {!isKindergarten ? (
                    <>
                      <td className="text-center">{(m1.fa1||0) + (m1.fa2||0)}</td>
                      <td className="text-center">{sa1Disp}</td>
                      <td className="text-center">{m1.internal || 0}</td>
                      <td className="text-center bg-slate-50 font-black">{sub.isGradeOnly ? '-' : t1}</td>
                      <td className="text-center font-black">{sub.isGradeOnly ? (m1.grade || '-') : '-'}</td>
                      
                      {isSem2 && (
                        <>
                          <td className="text-center">{(m2.fa1||0) + (m2.fa2||0)}</td>
                          <td className="text-center">{sa2Disp}</td>
                          <td className="text-center">{m2.internal || 0}</td>
                          <td className="text-center bg-slate-50 font-black">{sub.isGradeOnly ? '-' : t2}</td>
                          <td className="text-center font-black">{sub.isGradeOnly ? (m2.grade || '-') : '-'}</td>
                        </>
                      )}
                      <td className="text-center bg-navy-50 font-black">{sub.isGradeOnly ? '-' : (isSem2 ? (t1 + t2) : t1)}</td>
                    </>
                  ) : (
                    <>
                      <td className="text-center">{sub.isGradeOnly ? (m1.grade || '-') : t1}</td>
                      {isSem2 && <td className="text-center">{sub.isGradeOnly ? (m2.grade || '-') : t2}</td>}
                      <td className="text-center bg-navy-50 font-black">
                        {sub.isGradeOnly ? '-' : (isSem2 ? (t1 + t2) : t1)}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="border-t-2 border-navy-900 h-12 bg-navy-900 text-white divide-x divide-navy-700 text-center">
              <td className="px-4 font-black text-left">TOTAL / GRADE</td>
              {!isKindergarten ? (
                <>
                  <td className="text-center">{(Object.values(result.semester1).reduce((a, b) => a + (b.fa1 || 0) + (b.fa2 || 0), 0))}</td>
                  <td className="text-center">{(Object.values(result.semester1).reduce((a, b) => a + (b.sa1 || 0), 0))}</td>
                  <td className="text-center">{(Object.values(result.semester1).reduce((a, b) => a + (b.internal || 0), 0))}</td>
                  <td className="text-center text-lg bg-navy-800">{sem1Stats.obtained}</td>
                  <td className="text-center">{sem1Stats.grade}</td>
                  
                  {isSem2 && (
                    <>
                      <td className="text-center">{(Object.values(result.semester2).reduce((a, b) => a + (b.fa1 || 0) + (b.fa2 || 0), 0))}</td>
                      <td className="text-center">{(Object.values(result.semester2).reduce((a, b) => a + (b.sa1 || 0), 0))}</td>
                      <td className="text-center">{(Object.values(result.semester2).reduce((a, b) => a + (b.internal || 0), 0))}</td>
                      <td className="text-center text-lg bg-navy-800">{sem2Stats.obtained}</td>
                      <td className="text-center">{sem2Stats.grade}</td>
                    </>
                  )}
                </>
              ) : (
                <>
                  <td className="text-center bg-navy-800">{sem1Stats.obtained}</td>
                  {isSem2 && <td className="text-center bg-navy-800">{sem2Stats.obtained}</td>}
                </>
              )}
              <td className="text-center bg-navy-700 text-xl">
                {grandTotal} <span className="text-[10px] ml-1 opacity-70">({finalGrade})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-6 border-2 border-navy-900 divide-x-2 divide-navy-900 mb-12">
        <div className="p-3 bg-slate-50 col-span-1">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Issued Date</span>
          <span className="text-xs font-black text-navy-900 leading-none">05-06-2026</span>
        </div>
        <div className="p-3">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Percentage</span>
          <span className="text-xl font-black text-navy-900 leading-none italic">{overallPercentage.toFixed(2)}%</span>
        </div>
        <div className="p-3 bg-slate-50">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Grade</span>
          <span className="text-xl font-black text-navy-900 leading-none font-serif">{finalGrade}</span>
        </div>
        <div className="p-3">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Attendance</span>
          <div className="text-[10px] font-black text-navy-900 leading-tight flex flex-col justify-center h-full">
            {!isSem2 ? (
              <div>S1: {result.attendance?.sem1 || '-'}</div>
            ) : (
              <>
                <div>S1: {result.attendance?.sem1 || '-'}</div>
                <div className="mt-0.5 pt-0.5 border-t border-navy-100">S2: {result.attendance?.sem2 || '-'}</div>
              </>
            )}
          </div>
        </div>
        <div className="p-3 bg-slate-50 col-span-2">
          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Remarks</span>
          <span className="text-xs font-black text-navy-900 leading-none uppercase tracking-widest">EXCELLENT</span>
        </div>
      </div>

      {/* Signatures */}
      <div className="flex justify-between items-end px-4 mb-8">
        <div className="text-center">
          <div className="w-48 border-t-2 border-navy-900 pt-3">
            <span className="text-[10px] font-black uppercase text-navy-900 tracking-[0.3em]">Class Teacher</span>
          </div>
        </div>
        
        <div className="text-center group">
          {isSem2 && (
            <>
              <div className="mb-4 text-[11px] font-black text-navy-700 italic border border-navy-200 px-4 py-1 rounded bg-slate-50 uppercase tracking-widest no-print">
                Promotion Granted to {parseInt(student.standard.split(' ')[1] || '0') + 1}th Standard
              </div>
              <div className="text-[9px] font-bold text-slate-400 mb-2 no-print">School Reopen on 8th June 2026</div>
            </>
          )}
        </div>

        <div className="text-center">
          <div className="w-48 border-t-2 border-navy-900 pt-3 flex flex-col">
            <span className="text-[10px] font-black uppercase text-navy-900 tracking-[0.3em]">Principal</span>
            <span className="text-[9px] font-bold text-navy-900 mt-1 uppercase leading-none">SAINT MARY'S KIDS</span>
            <span className="text-[9px] font-bold text-navy-900 uppercase">LATHI</span>
          </div>
        </div>
      </div>

      <p className="text-[7px] text-center text-slate-400 italic mb-4">
        N.B.: No change in any above entry in the statement , shall be made except the authority issuing the certificate
      </p>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .report-card, .report-card * { visibility: visible; }
          .no-print { display: none !important; }
          .report-card { 
            position: fixed; 
            left: 0; 
            top: 0; 
            width: 100%; 
            height: 100%;
            padding: 40px !important;
          }
        }
      `}} />
    </div>
  );
};

export default ResultCard;
