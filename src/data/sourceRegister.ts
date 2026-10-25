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
  { path: '/', label: 'Owner home', source: 'Supabase (vehicles, service_orders) + sample KPI cards', status: 'sample', note: 'vehicle/order tables live; overview cards sample' },
  { path: '/mechanic', label: 'Mechanic workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/service-node', label: 'Service node workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/vendor', label: 'Vendor workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/wholesaler', label: 'Wholesaler workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/fleet', label: 'Fleet workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/manufacturer', label: 'Manufacturer workspace', source: 'mockData.ts', status: 'sample' },
  { path: '/admin', label: 'Admin center', source: 'Supabase (app_users, service_nodes) + sample metrics', status: 'sample', note: 'user/node tables live; KPI cards sample' },
  { path: '/marketplace', label: 'Marketplace', source: 'marketplace_listings (live table, seeded rows)', status: 'sample', note: 'table is real; current rows are seed data' },
  { path: '/jobs', label: 'Jobs', source: 'mockData.ts', status: 'sample' },
  { path: '/ai-brain', label: 'AI Brain', source: 'ai-reason edge function + ai_tool_runs provenance', status: 'live' },
  { path: '/ai-concierge', label: 'AI Concierge', source: 'ai-concierge edge function (OpenAI GPT-4.1-mini) + concierge_conversations log', status: 'live' },
  { path: '/government/cases', label: 'Compliance cases', source: 'gov_cases + gov_readiness_templates (synthetic test lane)', status: 'sample', note: 'by design: test environment only, no official integration' },
  { path: '/emergency', label: 'Emergency', source: 'static UI — no dispatch backend', status: 'unverified', note: 'SOS intake not yet connected' },
  { path: '/provider', label: 'Provider Hub', source: 'organizations, provider_capabilities, bookings (live)', status: 'live' },
  { path: '/payments', label: 'Payment Sandbox', source: 'payment_providers, payment_intents (sandbox adapters)', status: 'sample', note: 'simulated money only — no live processing' },
  { path: '/academy', label: 'Academy', source: 'courses, question_banks, exam_attempts, credentials (live)', status: 'live' },
  { path: '/offers', label: 'Parts Offers', source: 'seller_offers via offers.browse (public, cap-aware)', status: 'live' },
  { path: '/my-activity', label: 'My Activity', source: 'bookings, payments, reviews, passport, notifications (live)', status: 'live' },
  { path: '/admin/ops', label: 'Operations viewer', source: 'whitelisted read-only tables incl. Part-2 modules (live)', status: 'live' },
  { path: '/my-activity', label: 'My Activity (quotes, job cards, reviews)', source: 'bookings+quotes+checklists+reviews (live)', status: 'live' },
];

export function sourceForPath(pathname: string): PageSource | undefined {
  const hit = PAGE_SOURCES.find(p => p.path === pathname);
  if (hit) return hit;
  return PAGE_SOURCES.find(p => pathname.startsWith(p.path + '/'));
}
