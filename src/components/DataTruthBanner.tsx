import { useLocation } from 'react-router-dom';
import { FlaskConical, Database, AlertTriangle, Plug } from 'lucide-react';
import { sourceForPath, type DataStatus } from '@/data/sourceRegister';
import { cn } from '@/lib/utils';

const CONFIG: Record<DataStatus, { icon: any; className: string; label: (n?: string) => string }> = {
  'sample': { icon: FlaskConical, className: 'bg-amber-50 text-amber-800 border-amber-200', label: () => 'Sample data — demonstration content, not live records' },
  'unverified': { icon: AlertTriangle, className: 'bg-rose-50 text-rose-800 border-rose-200', label: () => 'Unverified — function not yet connected end-to-end' },
  'external-dependency': { icon: Plug, className: 'bg-sky-50 text-sky-800 border-sky-200', label: () => 'External dependency' },
  'live': { icon: Database, className: '', label: () => '' },
};

export default function DataTruthBanner() {
  const { pathname } = useLocation();
  const src = sourceForPath(pathname);
  if (!src || src.status === 'live') return null;
  const cfg = CONFIG[src.status];
  const Icon = cfg.icon;
  return (
    <div className={cn('flex items-center gap-2 border-b px-4 py-1.5 text-[11px] font-medium', cfg.className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{cfg.label(src.note)} — {src.label}.</span>
      {src.note && <span className="opacity-70 hidden sm:inline">({src.note})</span>}
      <span className="ml-auto opacity-60 hidden md:inline">Source: {src.source}</span>
    </div>
  );
}
