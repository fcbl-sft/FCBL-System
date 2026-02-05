
// Simple AQL Logic based on General Inspection Level II
// This is a simplified lookup table for demonstration

interface AQLStandard {
  min: number;
  max: number;
  sampleSize: number;
  major: { accept: number; reject: number }; // AQL 2.5
  minor: { accept: number; reject: number }; // AQL 4.0
}

const AQL_TABLE: AQLStandard[] = [
  { min: 2, max: 8, sampleSize: 2, major: { accept: 0, reject: 1 }, minor: { accept: 0, reject: 1 } },
  { min: 9, max: 15, sampleSize: 3, major: { accept: 0, reject: 1 }, minor: { accept: 0, reject: 1 } },
  { min: 16, max: 25, sampleSize: 5, major: { accept: 0, reject: 1 }, minor: { accept: 0, reject: 1 } },
  { min: 26, max: 50, sampleSize: 8, major: { accept: 0, reject: 1 }, minor: { accept: 1, reject: 2 } },
  { min: 51, max: 90, sampleSize: 13, major: { accept: 1, reject: 2 }, minor: { accept: 1, reject: 2 } },
  { min: 91, max: 150, sampleSize: 20, major: { accept: 1, reject: 2 }, minor: { accept: 2, reject: 3 } },
  { min: 151, max: 280, sampleSize: 32, major: { accept: 2, reject: 3 }, minor: { accept: 3, reject: 4 } },
  { min: 281, max: 500, sampleSize: 50, major: { accept: 3, reject: 4 }, minor: { accept: 5, reject: 6 } },
  { min: 501, max: 1200, sampleSize: 80, major: { accept: 5, reject: 6 }, minor: { accept: 7, reject: 8 } },
  { min: 1201, max: 3200, sampleSize: 125, major: { accept: 7, reject: 8 }, minor: { accept: 10, reject: 11 } },
  { min: 3201, max: 10000, sampleSize: 200, major: { accept: 10, reject: 11 }, minor: { accept: 14, reject: 15 } },
  { min: 10001, max: 35000, sampleSize: 315, major: { accept: 14, reject: 15 }, minor: { accept: 21, reject: 22 } },
];

export const getAQLStandard = (lotSize: number): AQLStandard => {
  const standard = AQL_TABLE.find(r => lotSize >= r.min && lotSize <= r.max);
  return standard || AQL_TABLE[AQL_TABLE.length - 1];
};

export const calculateInspectionResult = (
  lotSize: number, 
  criticalCount: number, 
  majorCount: number, 
  minorCount: number
): 'PASSED' | 'FAILED' => {
  const standard = getAQLStandard(lotSize);
  
  // Critical defects usually have AQL 0 -> any defect fails
  if (criticalCount > 0) return 'FAILED';
  
  if (majorCount > standard.major.accept) return 'FAILED';
  if (minorCount > standard.minor.accept) return 'FAILED';
  
  return 'PASSED';
};
