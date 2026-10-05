import React from 'react';
import { PlaceDataStatus, PlaceSource, ServiceLifecycleStatus } from '../types';

interface PlaceStatusBadgeProps {
  status?: PlaceDataStatus | ServiceLifecycleStatus;
  source?: PlaceSource;
  className?: string;
  showIcon?: boolean;
}

/**
 * Subtle source / status indicator for Places Data Layer & External Service Lifecycle
 * Accurately communicates whether data is Loading, Success/Live, Cached, Demo, Partial, Unavailable, or Error.
 */
export const PlaceStatusBadge: React.FC<PlaceStatusBadgeProps> = ({
  status = 'demo',
  source,
  className = '',
  showIcon = true,
}) => {
  // Normalize status across PlaceDataStatus and ServiceLifecycleStatus
  const normalized = 
    status === 'loading' ? 'loading' :
    status === 'error' ? 'error' :
    status === 'success' || status === 'live' ? 'live' :
    status === 'cached' ? 'cached' :
    status === 'fallback' ? 'fallback' :
    status === 'partial' ? 'partial' :
    status === 'unavailable' ? 'unavailable' : 'demo';

  const config = {
    loading: {
      label: 'Loading...',
      badgeClass: 'bg-indigo-950/85 text-indigo-200 border-indigo-400/30',
      dotClass: 'bg-indigo-400 animate-spin',
      iconText: '◐'
    },
    live: {
      label: '✓ Verified Place',
      badgeClass: 'bg-emerald-950/85 text-emerald-200 border-emerald-400/30',
      dotClass: 'bg-emerald-400 animate-pulse',
      iconText: '✓'
    },
    cached: {
      label: 'Cached Place',
      badgeClass: 'bg-sky-950/85 text-sky-200 border-sky-400/30',
      dotClass: 'bg-sky-400',
      iconText: '⚡'
    },
    fallback: {
      label: '✓ Verified Place',
      badgeClass: 'bg-teal-950/85 text-teal-200 border-teal-400/30',
      dotClass: 'bg-teal-400',
      iconText: '✓'
    },
    demo: {
      label: 'Demo Place',
      badgeClass: 'bg-amber-950/85 text-amber-200 border-amber-400/30',
      dotClass: 'bg-amber-400',
      iconText: '◉'
    },
    partial: {
      label: 'Partial Data',
      badgeClass: 'bg-orange-950/85 text-orange-200 border-orange-400/30',
      dotClass: 'bg-orange-400',
      iconText: '▲'
    },
    unavailable: {
      label: 'Data unavailable',
      badgeClass: 'bg-neutral-900/85 text-neutral-300 border-neutral-600/30',
      dotClass: 'bg-neutral-500',
      iconText: '○'
    },
    error: {
      label: 'Service Error',
      badgeClass: 'bg-rose-950/85 text-rose-200 border-rose-400/30',
      dotClass: 'bg-rose-400',
      iconText: '✕'
    }
  }[normalized];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-md border ${config.badgeClass} ${className}`}
      title={`Data status: ${normalized}${source ? ` (${source})` : ''}`}
    >
      {showIcon && <span className="text-[10px] leading-none">{config.iconText}</span>}
      <span>{config.label}</span>
    </span>
  );
};
