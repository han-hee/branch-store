import { NextRequest, NextResponse } from 'next/server';

// 2026년 대한민국 주요 공휴일 백업 데이터 (API 실패 또는 지연 시 안정적인 Fallback)
const FALLBACK_2026_HOLIDAYS: Record<string, { totalDays: number; holidays: string[] }> = {
  '2026-01': { totalDays: 1, holidays: ['1/1 신정'] },
  '2026-02': { totalDays: 4, holidays: ['2/16~18 설날 연휴', '2/19 대체공휴일'] },
  '2026-03': { totalDays: 1, holidays: ['3/1 삼일절', '3/2 대체공휴일'] },
  '2026-04': { totalDays: 0, holidays: [] },
  '2026-05': { totalDays: 2, holidays: ['5/5 어린이날', '5/24 부처님오신날', '5/25 대체공휴일'] },
  '2026-06': { totalDays: 0, holidays: ['6/6 현충일 (토)'] },
  '2026-07': { totalDays: 0, holidays: [] },
  '2026-08': { totalDays: 1, holidays: ['8/15 광복절', '8/17 대체공휴일'] },
  '2026-09': { totalDays: 3, holidays: ['9/24~26 추석 연휴 (3일)'] },
  '2026-10': { totalDays: 2, holidays: ['10/3 개천절', '10/5 대체공휴일', '10/9 한글날'] },
  '2026-11': { totalDays: 0, holidays: [] },
  '2026-12': { totalDays: 1, holidays: ['12/25 성탄절'] },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || '2026';
  const month = (searchParams.get('month') || '09').padStart(2, '0');
  const monthKey = `${year}-${month}`;

  const apiKey = process.env.HOLIDAY_API_KEY || '';

  // 1. 공공데이터포털 API 호출 시도
  if (apiKey) {
    try {
      const url = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${encodeURIComponent(
        apiKey
      )}&solYear=${year}&solMonth=${month}&_type=json`;

      const response = await fetch(url, { next: { revalidate: 86400 } });

      if (response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          const body = data?.response?.body;
          if (body) {
            const rawItems = body?.items?.item;
            const items = Array.isArray(rawItems)
              ? rawItems
              : rawItems
              ? [rawItems]
              : [];

            const holidays = items
              .filter((item: { isHoliday?: string }) => item.isHoliday === 'Y')
              .map((item: { dateName?: string; locdate?: number }) => {
                const dStr = String(item.locdate);
                const day = dStr.slice(6);
                return `${Number(month)}/${day} ${item.dateName}`;
              });

            return NextResponse.json({
              year,
              month,
              monthKey,
              totalDays: holidays.length,
              holidays,
              source: 'public_data_portal',
            });
          }
        } catch {
          // JSON 파싱 실패 시 fallback으로 전환
        }
      }
    } catch (err) {
      console.warn('Public holiday API fetch failed, using fallback:', err);
    }
  }

  // 2. Fallback 캐시 반환
  const fallback = FALLBACK_2026_HOLIDAYS[monthKey] || { totalDays: 0, holidays: [] };

  return NextResponse.json({
    year,
    month,
    monthKey,
    totalDays: fallback.totalDays,
    holidays: fallback.holidays,
    source: 'fallback_calendar',
  });
}
