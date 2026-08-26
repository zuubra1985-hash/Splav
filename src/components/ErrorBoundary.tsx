import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Compass } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Splav86 ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('splav86_active_tab');
    } catch {}
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F2ED] text-[#2D332D] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E5E0D8] shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#C85A32]/10 border border-[#C85A32]/20 flex items-center justify-center mx-auto text-[#C85A32]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold text-[#1A1F1A]">
                Временная заминка в приложении
              </h1>
              <p className="text-xs sm:text-sm text-[#6B665F] leading-relaxed">
                Произошла ошибка при отображении экрана. Ваши сохраненные маршруты и данные в безопасности.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#F9F7F4] p-3 rounded-xl border border-[#E5E0D8] text-left text-[11px] font-mono text-[#8B7E6D] overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-[#2D5A27] hover:bg-[#23471F] text-white text-xs font-bold rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Перезагрузить приложение</span>
              </button>

              <button
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch {}
                  window.location.href = '/';
                }}
                className="w-full py-2.5 px-4 text-[#8B7E6D] hover:text-[#2D5A27] text-xs font-medium rounded-xl transition-all"
              >
                Сбросить кэш и войти заново
              </button>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#A89F91]">
              <Compass className="w-3.5 h-3.5 text-[#2D5A27]" />
              <span>Splav86 — Северная навигация</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
