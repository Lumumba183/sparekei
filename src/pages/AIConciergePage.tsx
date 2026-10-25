import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles, Wrench, Car, ShieldCheck, FileCheck2 } from 'lucide-react';
import { useSession } from '@clerk/clerk-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from '@/types';

// ---- Intent router (client-side first pass; server re-enforces boundaries) ----
type Intent = 'part_identification' | 'symptom' | 'marketplace_search' | 'provider_discovery' | 'booking' | 'vehicle_history' | 'general';
function classifyIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/(identify|what part|which part|find.*part|part number|oe number|this part)/.test(t)) return 'part_identification';
  if (/(noise|vibration|leak|overheat|won't start|wont start|check engine|smoke|rough idle|diagnos|symptom)/.test(t)) return 'symptom';
  if (/(buy|price|cost of|shop|marketplace|order.*part)/.test(t)) return 'marketplace_search';
  if (/(garage|mechanic near|find.*service|workshop|provider)/.test(t)) return 'provider_discovery';
  if (/(book|appointment|schedule|quote|rfq)/.test(t)) return 'booking';
  if (/(history|service record|passport|accident record|logbook)/.test(t)) return 'vehicle_history';
  return 'general';
}

const INTENT_LABELS: Record<Intent, string> = {
  part_identification: 'Part identification',
  symptom: 'Symptom / diagnostics',
  marketplace_search: 'Marketplace',
  provider_discovery: 'Provider discovery',
  booking: 'Booking / quote',
  vehicle_history: 'Vehicle history',
  general: 'General',
};

// Evidence the Concierge may collect for part identification (never invented)
interface PartEvidence { vehicle?: string; partLocation?: string; oeNumber?: string; dimensions?: string; symptoms?: string; }

const suggestedPrompts = [
  { icon: Wrench, text: 'My brakes make a grinding noise — what should I check?' },
  { icon: Car, text: 'Can you identify a part for me?' },
  { icon: ShieldCheck, text: 'How do I prepare my vehicle for inspection?' },
  { icon: FileCheck2, text: 'Help me organize my vehicle documents' },
];

export default function AIConciergePage() {
  const { user } = useAuth();
  const { session } = useSession();
  const firstName = (user as any)?.full_name?.split(' ')[0] ?? (user as any)?.email?.split('@')[0] ?? 'there';
  const role = ((user as any)?.role ?? 'owner') as string;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState('OpenAI GPT-4.1-mini via Sparekei Concierge');
  const [intent, setIntent] = useState<Intent>('general');
  const [persona, setPersona] = useState<string>(role);
  const PERSONAS = [
    { key: 'owner', label: 'Vehicle Owner' }, { key: 'mechanic', label: 'Mechanic' },
    { key: 'service_node_operator', label: 'Garage' }, { key: 'vendor', label: 'Vendor' },
    { key: 'wholesaler', label: 'Wholesaler' }, { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'fleet_manager', label: 'Fleet' }, { key: 'admin', label: 'Admin' },
  ];
  const [evidence, setEvidence] = useState<PartEvidence>({});
  const greeted = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // R1: natural, context-aware greeting — once, with salutation and role awareness
  useEffect(() => {
    if (!greeted.current && user) {
      greeted.current = true;
      const roleNames: Record<string, string> = {
        owner: 'vehicle owner', mechanic: 'mechanic', service_node_operator: 'service provider',
        vendor: 'parts vendor', wholesaler: 'wholesaler', manufacturer: 'manufacturer',
        fleet_manager: 'fleet manager', admin: 'administrator',
      };
      const rn = roleNames[role] ?? 'vehicle owner';
      setMessages([{
        id: crypto.randomUUID(), role: 'assistant',
        content: `Hello ${firstName}! I'm your Sparekei Concierge, working with you in your ${rn} workspace.\n\nI can help with vehicle and part questions, symptom guidance, finding providers, your vehicle history, and getting your documents and compliance checklists organized.\n\nWhat would you like to do?`,
        timestamp: new Date().toISOString(),
      }]);
    }
  }, [user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput(''); setError(null);
    const detected = classifyIntent(text);
    setIntent(detected);
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setBusy(true);
    try {
      const token = (await session?.getToken({ template: 'supabase' })) ?? null;
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data, error: fnErr } = await getSupabase(token).functions.invoke('ai-concierge', {
        body: { message: text, persona, intent: detected, history, evidence },
      });
      if (fnErr) throw new Error(fnErr.message ?? 'Concierge request failed');
      if (data?.provider) setProvider(data.provider);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: data?.answer ?? 'I could not produce an answer. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please retry.');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'Sorry — I could not reach the Concierge service just now. Your message was not processed; please try again in a moment.',
        timestamp: new Date().toISOString(),
      }]);
    } finally { setBusy(false); }
  };

  const evField = (key: keyof PartEvidence, label: string, placeholder: string) => (
    <div key={key} className="flex-1 min-w-[160px]">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <Input value={evidence[key] ?? ''} placeholder={placeholder}
        onChange={e => setEvidence(prev => ({ ...prev, [key]: e.target.value }))} className="h-8 text-xs mt-0.5" />
    </div>
  );

  return (
    <div className="container max-w-3xl py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Concierge</h1>
          <p className="text-xs text-muted-foreground">{provider}</p>
        </div>
        <Select value={persona} onValueChange={setPersona}>
          <SelectTrigger className="h-7 w-[150px] text-[11px] ml-auto"><SelectValue /></SelectTrigger>
          <SelectContent>{PERSONAS.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
        <Badge variant="secondary" className="text-[10px]">{INTENT_LABELS[intent]}</Badge>
      </div>

      <Card className="p-4 h-[52vh] overflow-y-auto space-y-3 bg-muted/20">
        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}>
            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0',
              m.role === 'assistant' ? 'bg-primary/10' : 'bg-muted')}>
              {m.role === 'assistant' ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
            </div>
            <div className={cn('rounded-xl px-3.5 py-2.5 text-sm max-w-[80%] whitespace-pre-wrap leading-relaxed',
              m.role === 'assistant' ? 'bg-background border shadow-sm' : 'bg-primary text-primary-foreground')}>
              {m.content}
            </div>
          </motion.div>
        ))}
        {busy && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
            <div className="bg-background border shadow-sm rounded-xl px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </Card>

      {/* R2: part-identification evidence strip — collected, never invented */}
      {intent === 'part_identification' && (
        <Card className="p-3 border-dashed">
          <p className="text-[11px] font-semibold mb-2 text-muted-foreground">PART IDENTIFICATION — EVIDENCE (optional, the more you give the better the answer)</p>
          <div className="flex flex-wrap gap-2">
            {evField('vehicle', 'Vehicle', 'e.g. Toyota Corolla 2015 1.8')}
            {evField('partLocation', 'Part location', 'e.g. front left suspension')}
            {evField('oeNumber', 'OE / part number', 'any markings on the part')}
            {evField('dimensions', 'Dimensions', 'approx. size / measurements')}
            {evField('symptoms', 'Symptoms', 'what the vehicle is doing')}
          </div>
        </Card>
      )}

      {messages.length <= 1 && (
        <div className="grid grid-cols-2 gap-2">
          {suggestedPrompts.map((p) => (
            <button key={p.text} onClick={() => send(p.text)}
              className="flex items-center gap-2 text-left text-xs p-2.5 rounded-lg border bg-background hover:bg-muted/50 transition">
              <p.icon className="h-3.5 w-3.5 text-primary shrink-0" /> {p.text}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about vehicles, parts, providers, history, or compliance…" className="h-10" />
        <Button onClick={() => send()} disabled={busy || !input.trim()} size="icon" className="h-10 w-10"><Send className="h-4 w-4" /></Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        The Concierge advises and routes you to the real workflows. It never completes purchases, bookings, payments,
        inspections, or government submissions on its own.
      </p>
    </div>
  );
}
