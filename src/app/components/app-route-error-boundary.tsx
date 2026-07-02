import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router';

function getRouteErrorCopy(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return {
        title: 'That page wandered off',
        message: 'Try heading back to the main app and opening it again.',
      };
    }
    return {
      title: `Something broke (${error.status})`,
      message: error.statusText || 'Please reload the app and try again.',
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      title: 'Something broke',
      message: error.message.trim(),
    };
  }

  return {
    title: 'Something broke',
    message: 'Please reload the app and try again.',
  };
}

export function AppRouteErrorBoundary() {
  const error = useRouteError();
  const copy = getRouteErrorCopy(error);
  const navigate = useNavigate();

  const reloadFromDashboard = () => {
    reloadAppFromDashboard();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md rounded-[28px] border border-[#E2E8F0] bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#B91C1C]">
          <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">{copy.title}</h1>
        <p className="mt-3 text-sm leading-7 text-[#64748B]">{copy.message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reloadFromDashboard}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F172A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E293B]"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
            Reload app
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
          >
            <Home className="h-4 w-4" strokeWidth={1.8} />
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export function reloadAppFromDashboard(reload: () => void = () => window.location.reload()) {
  try {
    window.history.replaceState(window.history.state, '', '/dashboard');
    reload();
  } catch {
    window.location.replace('/dashboard');
  }
}
