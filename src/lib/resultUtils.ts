import { Mark, StudentStandard } from '../types';

export const calculateMark = (mark: Mark, standard: StudentStandard) => {
  const isKindergarten = [StudentStandard.NURSERY, StudentStandard.LKG, StudentStandard.UKG].includes(standard);
  
  if (isKindergarten) {
    // For Nursery, LKG, UKG, they just enter the total marks for the assessment/subject
    // as per user request "each subject is 100 marks"
    return mark.sa1 || 0; 
  }

  // Std 1-8 Calculation
  const fa1 = mark.fa1 || 0; // max 20
  const fa2 = mark.fa2 || 0; // max 20
  const sa1Raw = mark.sa1 || 0; // max 80 (Std 6-8) or 40 (Std 1-2)
  const internal = mark.internal || 0; // max 20
  
  let sa1Final = sa1Raw;
  if ([StudentStandard.STD6, StudentStandard.STD7, StudentStandard.STD8].includes(standard)) {
    sa1Final = sa1Raw / 2; // Convert 80 to 40
  }
  // For Std 1-2, SA1 is already 40 as per user request
  
  return fa1 + fa2 + sa1Final + internal; // 20 + 20 + 40 + 20 = 100
};

export const getGrade = (percentage: number) => {
  if (percentage >= 91) return 'A1';
  if (percentage >= 81) return 'A2';
  if (percentage >= 71) return 'B1';
  if (percentage >= 61) return 'B2';
  if (percentage >= 51) return 'C1';
  if (percentage >= 41) return 'C2';
  if (percentage >= 33) return 'D';
  return 'E';
};

export const calculateResultTotals = (semesterMarks: Record<string, Mark>, standard: StudentStandard, subjectConfigs: any[]) => {
  let obtained = 0;
  let total = 0;
  
  subjectConfigs.forEach(sub => {
    if (sub.isGradeOnly) return;
    const mark = semesterMarks[sub.id] || {};
    obtained += calculateMark(mark, standard);
    total += 100;
  });
  
  const percentage = total > 0 ? (obtained / total) * 100 : 0;
  return {
    obtained,
    total,
    percentage,
    grade: getGrade(percentage)
  };
};
