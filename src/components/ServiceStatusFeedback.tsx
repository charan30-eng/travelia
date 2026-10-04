import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Database, CloudOff, Info } from 'lucide-react';
import { ServiceLifecycleStatus } from '../types';

interface ServiceStatusFeedbackProps {
  status: ServiceLifecycleStatus;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  children?: React.ReactNode;
  showNoticeOnlyWhenCachedOrPartial?: boolean;
}

/**
 * Universal feedback component for Phase 9 Reliability & Error UX
 * Distinguishes loading, success, partial, cached, unavailable, and error states.
 * Guarantees zero blank screens across all async operations.
 */
export const ServiceStatusFeedback: React.FC<ServiceStatusFeedbackProps> = ({
  status,
  title,
  message,
  onRetry,
  className = '',
  children,
  showNoticeOnlyWhenCachedOrPartial = true,
}) => {
  // 1. Loading State
  if (status === 'loading') {
    return (
      <div className={`p-8 sm:p-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-neutral-200/80 shadow-2xs space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-[#E5ECE0] flex items-center justify-center text-[#344E27]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-900">{title || 'Loading intelligence...'}</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md">{message || 'Fetching verified data from Travelia service endpoints.'}</p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (status === 'error') {
    return (
      <div className={`p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-rose-50/60 rounded-3xl border border-rose-200/80 shadow-2xs space-y-4 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-bold text-rose-950">{title || 'Service Unavailable'}</h3>
          <p className="text-xs text-rose-800/80 mt-1">{message || 'An error occurred while communicating with external providers. Our resilient fallbacks are ready.'}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Unavailable State (External provider down, fallback active)
  if (status === 'unavailable' && !children) {
    return (
      <div className={`p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-amber-50/70 rounded-3xl border border-amber-200/80 shadow-2xs space-y-4 ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
          <CloudOff className="w-6 h-6" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-bold text-amber-950">{title || 'Provider Offline'}</h3>
          <p className="text-xs text-amber-800/80 mt-1">{message || 'Live provider services are temporarily unreachable. Travelia is displaying cached and fallback data.'}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check Connectivity</span>
          </button>
        )}
      </div>
    );
  }

  // 4. Success, Partial, or Cached with children
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Informative banners for degraded but functional states */}
      {status === 'partial' && showNoticeOnlyWhenCachedOrPartial && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-50/90 border border-orange-200 rounded-2xl text-xs text-orange-900">
          <Info className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="flex-1 font-medium">{message || 'Partial results displayed: Some external provider data was unavailable and supplemented with fallback estimates.'}</span>
        </div>
      )}

      {status === 'cached' && showNoticeOnlyWhenCachedOrPartial && (
        <div className="flex items-center gap-2.5 px-4 py-2 bg-sky-50/90 border border-sky-200/70 rounded-2xl text-xs text-sky-900">
          <Database className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="flex-1 font-medium">{message || 'Serving high-speed cached response. Data is refreshed periodically to minimize cost and latency.'}</span>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900">
          <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="flex-1 font-medium">{message || 'Provider is currently offline. Operating in resilient fallback mode.'}</span>
        </div>
      )}

      {children}
    </div>
  );
};
