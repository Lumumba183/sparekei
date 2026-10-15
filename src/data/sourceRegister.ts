// R3 data-truth register: every page's authoritative data source.
// status: "live" (real Supabase tables) | "sample" (mockData.ts seed content) |
//         "unverified" | "external-dependency"
export type DataStatus = 'live' | 'sample' | 'unverified' | 'external-dependency';

export interface PageSource {
  path: string;
  label: string;
  source: string;
  status: DataStatus;
  note?: string;
}

export const PAGE_SOURCES: PageSource[] = [
  { path: '/', label: 'Landing', source: 'static content + Clerk session state', status: 'live' },
  { path: '/dashboard', label: 'Dashboard home', source: 'Supabase (vehicles, service_orders)', status: 'live' },
  { path: '/dashboard/owner', label: 'Owner workspace', source: 'mockData.ts', status: 'sample', note: 'being wired to vehicles/service_orders' },
  { path: '/dashboard/mechanic', label: 'Mechanic workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/service-node', label: 'Service node workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/vendor', label: 'Vendor workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/wholesaler', label: 'Wholesaler workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/fleet', label: 'Fleet workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/manufacturer', label: 'Manufacturer workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/admin', label: 'Admin center', source: 'Supabase (app_users, service_nodes) + partial sample metrics', status: 'sample', note: 'user/node tables live; KPI cards sample' },
  { path: '/marketplace', label: 'Marketplace', source: 'marketplace_listings (live table, seeded rows)', status: 'sample', note: 'table is real; current rows are seed data' },
  { path: '/dashboard/jobs', label: 'Jobs', source: 'mockData.ts', status: 'sample' },
  { path: '/dashboard/ai-brain', label: 'AI Brain', source: 'ai-reason edge function + ai_tool_runs provenance', status: 'live' },
  { path: '/dashboard/ai-concierge', label: 'AI Concierge', source: 'ai-concierge edge function (OpenAI GPT-4.1-mini) + concierge_conversations log', status: 'live' },
  { path: '/dashboard/government/cases', label: 'Government & compliance cases', source: 'gov_cases + templates (synthetic test lane)', status: 'sample', note: 'by design: test environment only, no official integration' },
  { path: '/emergency', label: 'Emergency', source: 'static UI — no dispatch backend', status: 'unverified', note: 'SOS intake not yet connected' },
];

export function sourceForPath(pathname: string): PageSource | undefined {
  const hit = PAGE_SOURCES.find(p => p.path === pathname);
  if (hit) return hit;
  // prefix match for detail routes
  return PAGE_SOURCES.find(p => pathname.startsWith(p.path + '/'));
}
