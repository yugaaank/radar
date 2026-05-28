import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RadarErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in Radar:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 p-8">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 border border-red-100 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Interface Failure</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                A critical error occurred while rendering the radar intelligence layer. 
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-gray-400 uppercase mb-2">Technical Detail</p>
                <p className="text-xs font-mono text-red-600 break-all">{this.state.error?.message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <RefreshCw size={16} />
              Re-initialize System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
