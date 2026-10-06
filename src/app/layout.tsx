import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: '오늘의원두 | 지점 매출 관리 시스템',
  description: '카페 프랜차이즈 오늘의원두 5개 지점 월간 매출 및 고객수 관리 대시보드',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col">
        {/* Navigation Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">☕</span>
              <div>
                <span className="font-bold text-lg text-slate-900 group-hover:text-amber-700 transition">
                  오늘의원두
                </span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  매출관리본부
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/"
                className="px-3.5 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1.5"
              >
                <span>📊</span>
                <span>매출 대시보드</span>
              </Link>
              <Link
                href="/input"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition shadow-sm flex items-center gap-1.5"
              >
                <span>📝</span>
                <span>지점 실적 입력</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          <p>© 2026 오늘의원두 영업관리팀. 본 페이지는 인증 없이 지정된 URL로 안전하게 접속할 수 있습니다.</p>
        </footer>
      </body>
    </html>
  );
}
