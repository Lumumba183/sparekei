import { useState, useEffect, useCallback } from 'react';
import { useClerk } from '@clerk/clerk-react';
import {
  BrainCircuit, Send, Sparkles, AlertTriangle, BookOpen, ScrollText,
  DatabaseZap, Check, X, RefreshCw, Loader2,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

type Tab = 'console' | 'learnings' | 'alerts' | 'runs' | 'knowledge';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'console', label: 'Reasoning Console', icon: BrainCircuit },
  { key: 'learnings', label: 'Learning Inbox', icon: Sparkles },
  { key: 'alerts', label: 'Predictive Alerts', icon: AlertTriangle },
  { key: 'runs', label: 'Agent Run Log', icon: ScrollText },
  { key: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
];

export default function AIBrainPage() {
  const { session } = useClerk();
  const [tab, setTab] = useState<Tab>('console');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // console
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  // learnings / alerts / runs / knowledge
  const [learnings, setLearnings] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');

  const token = useCallback(async () => (await session?.getToken({ template: 'supabase' })) ?? null, [session]);

  const run = useCallback(async (fn: (t: string | null) => Promise<void>) => {
    setBusy(true); setError(null); setNotice(null);
    try { await fn(await token()); } catch (e: any) { setError(e.message ?? 'Request failed'); }
    finally { setBusy(false); }
  }, [token]);

  const refresh = useCallback(() => run(async (t) => {
    const sb = getSupabase(t);
    const [{ data: h }, { data: l }, { data: a }, { data: r }, { data: d }] = await Promise.all([
      sb.from('ai_conversations').select('*').order('created_at', { ascending: false }).limit(20),
      sb.from('ai_learnings').select('*').order('created_at', { ascending: false }).limit(50),
      sb.from('ai_alerts').select('*').order('created_at', { ascending: false }).limit(50),
      sb.from('ai_tool_runs').select('*, ai_conversations(question)').order('created_at', { ascending: false }).limit(50),
      sb.from('knowledge_documents').select('id, title, source, created_at').order('created_at', { ascending: false }).limit(50),
    ]);
    setHistory(h ?? []); setLearnings(l ?? []); setAlerts(a ?? []); setRuns(r ?? []); setDocs(d ?? []);
  }), []);

  useEffect(() => { refresh(); }, []);

  const ask = () => run(async (t) => {
    if (!question.trim()) return;
    const sb = getSupabase(t);
    const { data, error: fnErr } = await sb.functions.invoke('ai-reason', { body: { question } });
    if (fnErr) throw new Error(fnErr.message);
    if (data?.error) throw new Error(data.error);
    setAnswer(data); setQuestion(''); refresh();
  });

  const decide = (id: string, status: string) => run(async (t) => {
    await getSupabase(t).from('ai_learnings').update({ status }).eq('id', id);
    setNotice(`Learning ${status}.`); refresh();
  });

  const ackAlert = (id: string, status: string) => run(async (t) => {
    await getSupabase(t).from('ai_alerts').update({ status }).eq('id', id);
    refresh();
  });

  const runEngine = (fnName: string) => run(async (t) => {
    const { data, error: fnErr } = await getSupabase(t).functions.invoke(fnName, { body: {} });
    if (fnErr) throw new Error(fnErr.message);
    if (data?.error) throw new Error(data.error);
    setNotice(fnName === 'ai-learn'
      ? `Engine proposed ${data.proposed} learning(s).`
      : `Scan complete: ${data.inserted} new alert(s), ${data.skipped_duplicates} duplicates skipped.`);
    refresh();
  });

  const ingest = () => run(async (t) => {
    if (!docTitle.trim() || !docContent.trim()) return;
    const { data, error: fnErr } = await getSupabase(t).functions.invoke('ai-ingest', {
      body: { title: docTitle, content: docContent },
    });
    if (fnErr) throw new Error(fnErr.message);
    if (data?.error) throw new Error(data.error);
    setNotice(`Ingested: ${data.ingested.title}`); setDocTitle(''); setDocContent(''); refresh();
  });

  const sevColor = (s: string) => s === 'critical' ? 'text-red-400' : s === 'warning' ? 'text-amber-400' : 'text-sky-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BrainCircuit className="h-6 w-6 text-primary" /> AI Brain</h1>
          <p className="text-sm text-muted-foreground">Reasoning & Learning Engine — OpenAI-powered, provenance-logged, human-approved</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runEngine('ai-learn')} disabled={busy} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Run Learning Engine
          </button>
          <button onClick={() => runEngine('ai-alert-cron')} disabled={busy} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />} Run Alert Scan
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm border ${tab === t.key ? 'border-primary/50 bg-primary/10 text-white' : 'border-white/10 text-muted-foreground hover:text-white'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {notice && <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 text-sm text-teal-300">{notice}</div>}

      {tab === 'console' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="glass-card p-4">
              <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
                placeholder='Ask the engine, e.g. "Which service class is under-served in Nairobi, and should we onboard more Class C nodes?"'
                className="w-full rounded-lg border border-white/10 bg-background/60 p-3 text-sm text-white placeholder:text-muted-foreground" />
              <button onClick={ask} disabled={busy || !question.trim()}
                className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Reason
              </button>
            </div>
            {answer && (
              <div className="glass-card p-5">
                <p className="text-sm font-medium text-primary mb-2">Engine answer</p>
                <p className="text-sm whitespace-pre-wrap text-slate-200">{answer.answer}</p>
                {answer.citations?.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Sources (deterministic, logged)</p>
                    {answer.citations.map((c: any, i: number) => (
                      <p key={i} className="text-xs text-slate-400 flex items-center gap-2"><DatabaseZap className="h-3 w-3" /> {c.table} · {c.rows} rows</p>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  {answer.tokens?.prompt_tokens ?? 0} in / {answer.tokens?.completion_tokens ?? 0} out tokens · {answer.latency_ms} ms
                </p>
              </div>
            )}
          </div>
          <div className="glass-card p-4">
            <p className="text-sm font-medium mb-3">Recent questions</p>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg bg-background/60 p-3">
                  <p className="text-sm text-white">{h.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{h.answer}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{new Date(h.created_at).toLocaleString()} · {h.model} · {h.tokens_in + h.tokens_out} tok · ${Number(h.cost_usd).toFixed(5)}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-xs text-muted-foreground">No questions yet.</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'learnings' && (
        <div className="space-y-3">
          {learnings.map((l) => (
            <div key={l.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{l.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      l.status === 'approved' ? 'bg-teal-500/15 text-teal-400'
                      : l.status === 'rejected' ? 'bg-red-500/15 text-red-400'
                      : 'bg-amber-500/15 text-amber-400'}`}>{l.status}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">confidence: {l.confidence}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{l.body}</p>
                </div>
                {l.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => decide(l.id, 'approved')} className="flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white"><Check className="h-3 w-3" /> Approve</button>
                    <button onClick={() => decide(l.id, 'rejected')} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs"><X className="h-3 w-3" /> Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {learnings.length === 0 && <p className="text-sm text-muted-foreground">No learnings yet — run the Learning Engine above.</p>}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.map((a) => (
            <div key={a.id} className="glass-card p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${sevColor(a.severity)}`} />
                  <p className="font-medium text-white">{a.title}</p>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">{a.alert_type}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{a.message}</p>
              </div>
              {a.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => ackAlert(a.id, 'acknowledged')} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white">Acknowledge</button>
                  <button onClick={() => ackAlert(a.id, 'dismissed')} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Dismiss</button>
                </div>
              )}
            </div>
          ))}
          {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts — run the alert scan.</p>}
        </div>
      )}

      {tab === 'runs' && (
        <div className="glass-card p-4">
          <p className="text-sm font-medium mb-3">Tool invocations (full provenance)</p>
          <div className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg bg-background/60 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <DatabaseZap className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono text-white">{r.tool_name}</span>
                  <span className="text-muted-foreground">{r.row_count} rows · {r.latency_ms} ms</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Q: {(r.ai_conversations as any)?.question ?? '—'}</p>
                <p className="text-[11px] text-slate-600 font-mono line-clamp-2">{JSON.stringify(r.tool_args)}</p>
              </div>
            ))}
            {runs.length === 0 && <p className="text-xs text-muted-foreground">No tool runs logged yet.</p>}
          </div>
        </div>
      )}

      {tab === 'knowledge' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm font-medium">Ingest a document (embedded into the knowledge base)</p>
            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Title, e.g. Nairobi Q4 Parts Demand Report"
              className="w-full rounded-lg border border-white/10 bg-background/60 p-3 text-sm text-white placeholder:text-muted-foreground" />
            <textarea value={docContent} onChange={(e) => setDocContent(e.target.value)} rows={6} placeholder="Document content…"
              className="w-full rounded-lg border border-white/10 bg-background/60 p-3 text-sm text-white placeholder:text-muted-foreground" />
            <button onClick={ingest} disabled={busy || !docTitle.trim() || !docContent.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Embed & Store
            </button>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm font-medium mb-3">Stored documents ({docs.length})</p>
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="rounded-lg bg-background/60 p-3">
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.source} · {new Date(d.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {docs.length === 0 && <p className="text-xs text-muted-foreground">Knowledge base is empty.</p>}
            </div>
          </div>
        </div>
      )}

      <button onClick={refresh} disabled={busy} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white">
        <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} /> Refresh data
      </button>
    </div>
  );
}
