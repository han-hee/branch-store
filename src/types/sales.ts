export const BRANCH_NAMES = [
  '용산역점',
  '삼각지점',
  '이태원점',
  '효창공원점',
  '한남점',
] as const;

export type BranchName = (typeof BRANCH_NAMES)[number];

export interface SaleRecord {
  id?: number;
  month: string;         // '2026-09'
  branchName: string;    // '용산역점'
  salesAmount: number;   // 54320000
  customerCount: number; // 6820
  notes?: string | null; // 특이사항/비고
  createdAt?: string;
}

export interface HolidayItem {
  date: string;     // '2026-09-24'
  name: string;     // '추석'
  isHoliday: boolean;
}
