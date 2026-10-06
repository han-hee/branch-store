'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getSales } from '@/lib/supabase';
import { SaleRecord, BRANCH_NAMES } from '@/types/sales';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
} from 'recharts';

interface HolidayData {
  totalDays: number;
  holidays: string[];
}

export default function DashboardPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 선택된 비교 월
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // 각 월별 공휴일 캐시
  const [holidayMap, setHolidayMap] = useState<Record<string, HolidayData>>({});

  // 1. Supabase 데이터 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getSales();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setSales(res.data);
        // 가장 최근 월을 기본 선택 월로 지정
        const months = Array.from(new Set(res.data.map((r) => r.month))).sort();
        if (months.length > 0) {
          setSelectedMonth(months[months.length - 1]);
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // 2. 월 목록 추출 및 공휴일 API 비동기 로드
  const allMonths = useMemo(() => {
    const list = Array.from(new Set(sales.map((s) => s.month))).sort();
    return list;
  }, [sales]);

  useEffect(() => {
    if (allMonths.length === 0) return;

    allMonths.forEach(async (m) => {
      if (holidayMap[m]) return;
      const [year, month] = m.split('-');
      try {
        const res = await fetch(`/api/holidays?year=${year}&month=${month}`);
        if (res.ok) {
          const json = await res.json();
          setHolidayMap((prev) => ({
            ...prev,
            [m]: {
              totalDays: json.totalDays ?? 0,
              holidays: json.holidays ?? [],
            },
          }));
        }
      } catch (err) {
        console.warn('Failed to load holiday for', m, err);
      }
    });
  }, [allMonths, holidayMap]);

  // 3. 월별 집계 데이터 (추이 차트용)
  const monthlyTrendData = useMemo(() => {
    const grouped: Record<string, { totalSales: number; totalCustomers: number }> = {};
    sales.forEach((r) => {
      if (!grouped[r.month]) {
        grouped[r.month] = { totalSales: 0, totalCustomers: 0 };
      }
      grouped[r.month].totalSales += r.salesAmount;
      grouped[r.month].totalCustomers += r.customerCount;
    });

    return allMonths.map((m) => {
      const g = grouped[m] || { totalSales: 0, totalCustomers: 0 };
      const holidayInfo = holidayMap[m] || { totalDays: 0, holidays: [] };
      return {
        month: m,
        totalSales: g.totalSales,
        totalSalesInMillion: Math.round(g.totalSales / 10000) / 100, // 백만원 단위
        totalCustomers: g.totalCustomers,
        holidayDays: holidayInfo.totalDays,
        holidayNames: holidayInfo.holidays,
      };
    });
  }, [sales, allMonths, holidayMap]);

  // 4. 선택 월 지점별 데이터 (비교 차트용)
  const branchComparisonData = useMemo(() => {
    const records = sales.filter((r) => r.month === selectedMonth);
    return BRANCH_NAMES.map((name) => {
      const match = records.find((r) => r.branchName === name);
      return {
        branch: name,
        salesAmount: match ? match.salesAmount : 0,
        salesInMillion: match ? Math.round(match.salesAmount / 10000) / 100 : 0,
        customerCount: match ? match.customerCount : 0,
        notes: match?.notes || null,
      };
    }).sort((a, b) => b.salesAmount - a.salesAmount);
  }, [sales, selectedMonth]);

  // 5. 핵심 KPI 지표 계산 (선택 월 기준)
  const kpiMetrics = useMemo(() => {
    const currentMonthData = monthlyTrendData.find((d) => d.month === selectedMonth);
    const currentIndex = monthlyTrendData.findIndex((d) => d.month === selectedMonth);
    const prevMonthData = currentIndex > 0 ? monthlyTrendData[currentIndex - 1] : null;

    const currentSales = currentMonthData ? currentMonthData.totalSales : 0;
    const prevSales = prevMonthData ? prevMonthData.totalSales : 0;

    let growthRate = 0;
    if (prevSales > 0) {
      growthRate = Math.round(((currentSales - prevSales) / prevSales) * 1000) / 10;
    }

    const currentCustomers = currentMonthData ? currentMonthData.totalCustomers : 0;
    const avgSpend = currentCustomers > 0 ? Math.round(currentSales / currentCustomers) : 0;

    const topBranch = branchComparisonData.length > 0 && branchComparisonData[0].salesAmount > 0
      ? branchComparisonData[0].branch
      : '-';

    return {
      currentSales,
      growthRate,
      prevSales,
      currentCustomers,
      avgSpend,
      topBranch,
      holidayDays: holidayMap[selectedMonth]?.totalDays ?? 0,
      holidays: holidayMap[selectedMonth]?.holidays ?? [],
    };
  }, [monthlyTrendData, selectedMonth, branchComparisonData, holidayMap]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block animate-spin w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium">Supabase에서 실시간 매출 데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
        <h2 className="font-bold text-lg mb-2">데이터 로드 실패</h2>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700"
        >
          새로고침
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 대시보드 상단 헤더 & 컨트롤 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Executive Summary
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-2">지점 통합 매출 대시보드</h1>
          <p className="text-sm text-slate-500">
            전 지점의 월간 매출, 고객 수, 공휴일 영향도를 실시간으로 분석합니다.
          </p>
        </div>

        {/* 월 선택 필터 & 입력 바로가기 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">조회 월:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {allMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <Link
            href="/input"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition shadow-xs"
          >
            + 실적 입력
          </Link>
        </div>
      </div>

      {/* KPI 카드 4종 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 당월 총매출액 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">[{selectedMonth}] 전사 총 매출액</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {kpiMetrics.currentSales.toLocaleString()}
            <span className="text-sm font-normal text-slate-500 ml-1">원</span>
          </p>
          <div className="mt-2 text-xs flex items-center gap-1.5 font-medium">
            {kpiMetrics.growthRate >= 0 ? (
              <span className="text-emerald-600 flex items-center">
                ▲ {kpiMetrics.growthRate}%
              </span>
            ) : (
              <span className="text-rose-600 flex items-center">
                ▼ {Math.abs(kpiMetrics.growthRate)}%
              </span>
            )}
            <span className="text-slate-400">전월 대비</span>
          </div>
        </div>

        {/* 총 객수 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">[{selectedMonth}] 총 방문 객수</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {kpiMetrics.currentCustomers.toLocaleString()}
            <span className="text-sm font-normal text-slate-500 ml-1">명</span>
          </p>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            평균 객단가:{' '}
            <span className="text-slate-700 font-bold">{kpiMetrics.avgSpend.toLocaleString()}원</span>
          </p>
        </div>

        {/* 1위 지점 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">[{selectedMonth}] 최고 실적 지점</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {kpiMetrics.topBranch}
          </p>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            매출 1위 달성
          </p>
        </div>

        {/* 해당 월 공휴일 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">[{selectedMonth}] 법정 공휴일</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            총 {kpiMetrics.holidayDays}일
          </p>
          <p className="mt-2 text-xs text-slate-500 truncate" title={kpiMetrics.holidays.join(', ')}>
            {kpiMetrics.holidays.length > 0 ? kpiMetrics.holidays.join(', ') : '공휴일 없음'}
          </p>
        </div>
      </div>

      {/* 1. 월별 전체 매출 추이 차트 (공휴일 호버 툴팁 포함) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📈</span> 월별 전체 매출 및 객수 추이
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              차트의 각 월에 마우스를 올리면 <strong>해당 월의 공휴일 수 및 세부 휴일 정보</strong>가 툴팁으로 표시됩니다.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            (막대: 매출액 / 꺾은선: 객수)
          </div>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="left"
                stroke="#d97706"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v.toLocaleString()}백만`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6366f1"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v.toLocaleString()}명`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl text-xs space-y-2 border border-slate-800 min-w-[220px]">
                        <p className="font-bold text-sm text-amber-400 border-b border-slate-800 pb-1.5">
                          📅 {data.month} 실적 보고
                        </p>
                        <div className="space-y-1">
                          <p className="flex justify-between">
                            <span className="text-slate-400">총 매출액:</span>
                            <span className="font-bold text-amber-200">
                              {data.totalSales.toLocaleString()} 원
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span className="text-slate-400">총 객수:</span>
                            <span className="font-bold text-indigo-200">
                              {data.totalCustomers.toLocaleString()} 명
                            </span>
                          </p>
                        </div>
                        {/* 공휴일 정보 뱃지 */}
                        <div className="pt-2 border-t border-slate-800">
                          <p className="font-semibold text-rose-300 flex items-center gap-1">
                            <span>🏮</span> 해당 월 공휴일 총 {data.holidayDays}일
                          </p>
                          {data.holidayNames && data.holidayNames.length > 0 ? (
                            <ul className="mt-1 list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                              {data.holidayNames.map((h: string, idx: number) => (
                                <li key={idx}>{h}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[11px] text-slate-400 mt-0.5">법정 공휴일 없음</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar
                yAxisId="left"
                dataKey="totalSalesInMillion"
                name="총 매출액 (백만원)"
                fill="#d97706"
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalCustomers"
                name="총 객수 (명)"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. 지점별 매출 비교 차트 & 비고 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 지점별 비교 차트 (2칸) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>🏢</span> {selectedMonth} 지점별 실적 비교
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">5개 지점의 매출액 순위 및 객수를 비교합니다.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              매출 순 정렬
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="branch" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toLocaleString()}백만`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => {
                    const num = typeof val === 'number' ? val : Number(val) || 0;
                    if (name === '매출액 (백만원)') {
                      return [`${(num * 1000000).toLocaleString()}원`, '매출액'];
                    }
                    return [val, name];
                  }}
                />
                <Bar
                  dataKey="salesInMillion"
                  name="매출액 (백만원)"
                  fill="#0284c7"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 지점별 특이사항 피드 (1칸) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📋</span> {selectedMonth} 지점별 특이사항
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">지점장 보고 비고 사항</p>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {branchComparisonData.map((b) => (
              <div
                key={b.branch}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800">{b.branch}</span>
                  <span className="text-[11px] text-slate-400">
                    {b.salesAmount > 0 ? `${Math.round(b.salesAmount / 10000).toLocaleString()}만원` : '미입력'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {b.notes ? (
                    <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                      📌 {b.notes}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">특이사항 없음</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
