import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  /** If neither title nor showBack: shows logo mark */
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export function LogoMark() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt="LOCALlift"
        className="w-9 h-9 rounded-full object-cover"
        style={{ boxShadow: '0 0 10px rgba(149,170,255,0.3)' }}
      />
      <span
        className="text-xl font-black tracking-tight"
        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
      >
        <span className="text-on-surface">LOCAL</span>
        <span style={{ color: '#95aaff' }}>lift.</span>
      </span>
    </div>
  );
}

export default function Header({ title, subtitle, showBack = false, rightContent }: HeaderProps) {
  const navigate = useNavigate();
  const isMainScreen = !showBack && !title;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-5 py-3"
      style={{
        background: 'rgba(19, 19, 19, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(72, 72, 71, 0.15)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="text-on-surface hover:opacity-80 transition-opacity active:scale-95 duration-200 flex-shrink-0"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        {isMainScreen ? (
          <LogoMark />
        ) : (
          <div className="min-w-0">
            {title && (
              <h1
                className="text-lg font-bold tracking-tight text-on-surface uppercase truncate"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-on-surface-variant truncate">{subtitle}</p>
            )}
          </div>
        )}
      </div>
      {rightContent && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">{rightContent}</div>
      )}
    </header>
  );
}
