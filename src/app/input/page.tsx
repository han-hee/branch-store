'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BRANCH_NAMES, BranchName } from '@/types/sales';
import { saveSaleRecord } from '@/lib/supabase';

// 9월 지점장 단톡방 보고 원본 데이터 (빠른 입력 프리셋)
const SEPTEMBER_PRESETS = [
  { branch: '용산역점' as BranchName, sales: 54320000, visitors: 6820, notes: '' },
  { branch: '삼각지점' as BranchName, sales: 32480000, visitors: 4011, notes: '' },
  { branch: '이태원점' as BranchName, sales: 45870000, visitors: 5690, notes: '추석 연휴 3일 단축 영업' },
  { branch: '효창공원점' as BranchName, sales: 18900000, visitors: 2380, notes: '앞 도로 공사 아직 진행 중' },
  { branch: '한남점' as BranchName, sales: 46100000, visitors: 5520, notes: '' },
];

export default function InputPage() {
  const [branchName, setBranchName] = useState<BranchName>(BRANCH_NAMES[0]);
  const [month, setMonth] = useState<string>('2026-09');
  const [salesAmountStr, setSalesAmountStr] = useState<string>('');
  const [customerCountStr, setCustomerCountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 천 단위 콤마 포맷터
  const handleSalesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setSalesAmountStr('');
      return;
    }
    const num = parseInt(raw, 10);
    setSalesAmountStr(num.toLocaleString('ko-KR'));
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (!raw) {
      setCustomerCountStr('');
      return;
    }
    const num = parseInt(raw, 10);
    setCustomerCountStr(num.toLocaleString('ko-KR'));
  };

  // 프리셋 데이터 불러오기
  const applyPreset = (preset: (typeof SEPTEMBER_PRESETS)[0]) => {
    setBranchName(preset.branch);
    setMonth('2026-09');
    setSalesAmountStr(preset.sales.toLocaleString('ko-KR'));
    setCustomerCountStr(preset.visitors.toLocaleString('ko-KR'));
    setNotes(preset.notes);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const salesAmount = parseInt(salesAmountStr.replace(/,/g, ''), 10);
    const customerCount = parseInt(customerCountStr.replace(/,/g, ''), 10);

    if (isNaN(salesAmount) || salesAmount < 0) {
      setErrorMessage('매출액을 올바른 숫자로 입력해 주세요.');
      return;
    }

    if (isNaN(customerCount) || customerCount < 0) {
      setErrorMessage('객수(방문 고객 수)를 올바른 숫자로 입력해 주세요.');
      return;
    }

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      setErrorMessage('대상 월을 YYYY-MM 형식으로 선택해 주세요.');
      return;
    }

    setLoading(true);

    const res = await saveSaleRecord({
      month,
      branchName,
      salesAmount,
      customerCount,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (res.success) {
      setSuccessMessage(
        `[${branchName}] ${month} 실적 (매출 ${salesAmount.toLocaleString()}원 / 객수 ${customerCount.toLocaleString()}명)이 Supabase에 성공적으로 저장되었습니다!`
      );
      // 폼 초기화 (지점 및 월은 유지하여 편의성 도모)
      setSalesAmountStr('');
      setCustomerCountStr('');
      setNotes('');
    } else {
      setErrorMessage(`저장 실패: ${res.error || '알 수 없는 오류가 발생했습니다.'}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 타이틀 및 안내 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center text-2xl shadow">
            📝
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">지점 월간 실적 입력</h1>
            <p className="text-sm text-slate-500">
              로그인 없이 지점명과 실적을 입력하면 Supabase 데이터베이스에 실시간 저장됩니다.
            </p>
          </div>
        </div>

        {/* 9월 단톡방 데이터 빠른 입력 도우미 */}
        <div className="mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span>⚡</span> 9월 단톡방 보고 실적 빠른 채우기 (클릭 시 자동 입력)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SEPTEMBER_PRESETS.map((p) => (
              <button
                key={p.branch}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100 transition text-center shadow-xs"
              >
                {p.branch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        {/* 알림 메시지 */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between">
            <div>
              <p className="font-semibold">✅ 저장 완료</p>
              <p className="mt-1">{successMessage}</p>
            </div>
            <Link
              href="/"
              className="ml-3 shrink-0 px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition"
            >
              대시보드 보기
            </Link>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <p className="font-semibold">⚠️ 오류 발생</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 지점명 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              지점명 <span className="text-rose-500">*</span>
            </label>
            <select
              value={branchName}
              onChange={(e) => setBranchName(e.target.value as BranchName)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 text-slate-800 text-sm font-medium"
              required
            >
              {BRANCH_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 대상 월 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              대상 월 (YYYY-MM) <span className="text-rose-500">*</span>
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 text-slate-800 text-sm font-medium"
              required
            />
          </div>
        </div>

        {/* 매출액 입력 */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            월 매출액 (원) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 54,320,000"
              value={salesAmountStr}
              onChange={handleSalesChange}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-bold text-slate-900 placeholder:text-slate-300"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              원
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">숫자만 입력하시면 자동으로 천 단위 콤마(,)가 입력됩니다.</p>
        </div>

        {/* 객수 입력 */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            월 객수 (방문 고객 수) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 6,820"
              value={customerCountStr}
              onChange={handleCustomerChange}
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-bold text-slate-900 placeholder:text-slate-300"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
              명
            </span>
          </div>
        </div>

        {/* 비고 및 특이사항 */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            특이사항 / 비고 <span className="text-xs font-normal text-slate-400">(선택사항)</span>
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="예: 추석 연휴 3일 단축 영업, 인근 도로 공사로 유동 인구 감소 등"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm text-slate-800 placeholder:text-slate-300 resize-none"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-[0.99] transition shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Supabase에 실적 저장 중...</span>
              </>
            ) : (
              <>
                <span>실적 등록하기</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
