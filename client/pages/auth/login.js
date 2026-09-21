import Link from 'next/link';
import AuthForm from '../../components/AuthForm';

function Sparkline() {
  return (
    <div className="pt-auth-chart" aria-hidden="true">
      <svg viewBox="0 0 360 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ptAuthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          className="pt-auth-chart-area"
          d="M0 88 C40 84 55 70 90 72 C130 74 145 48 180 52 C220 56 240 38 270 34 C300 30 330 42 360 28 L360 120 L0 120 Z"
          fill="url(#ptAuthFill)"
        />
        <path
          className="pt-auth-chart-line"
          d="M0 88 C40 84 55 70 90 72 C130 74 145 48 180 52 C220 56 240 38 270 34 C300 30 330 42 360 28"
          stroke="#5eead4"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function BrandPanel({ isLogin }) {
  return (
    <aside className="pt-auth-brand pt-fade-in">
      <div className="pt-auth-brand-top">
        <Link href="/" className="pt-auth-wordmark pt-fade-up">
          Portfolio
          <span>Tracker</span>
        </Link>

        <div className="pt-fade-up-delay">
          <h1 className="pt-auth-headline">
            {isLogin
              ? 'A clear view of every holding you manage.'
              : 'Track the household portfolio with quiet precision.'}
          </h1>
          <p className="pt-auth-lede">
            {isLogin
              ? 'Equities, deposits, and metals — live values and family portfolios in one place.'
              : 'Built for Indian households who want clarity without another spreadsheet.'}
          </p>
          <Sparkline />
        </div>
      </div>

      <p className="pt-auth-meta">INR · NSE · Family portfolios</p>
    </aside>
  );
}

export default function LoginPage() {
  return (
    <div className="pt-auth-shell">
      <BrandPanel isLogin />
      <main className="pt-auth-panel">
        <div className="pt-auth-form-card pt-fade-up-delay">
          <AuthForm isLogin />
        </div>
      </main>
    </div>
  );
}
