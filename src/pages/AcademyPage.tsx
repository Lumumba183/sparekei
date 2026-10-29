import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { GraduationCap, Award, BookOpen, Play, RotateCcw, ShieldAlert, BadgeCheck, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { jres, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

interface ExamState { questions: { n: number; q: string; choices: string[] }[]; pass_mark: number; attempt_no: number; course_id: string; title: string; }

export default function AcademyPage() {
  const { session } = useSession();
  const [catalog, setCatalog] = useState<any>({ courses: [], enrollments: [] });
  const [badges, setBadges] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [exam, setExam] = useState<ExamState | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<any>(null);
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [appealText, setAppealText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fnUrl = (a: string) => `${SUPABASE_URL}/functions/v1/workspace-api?action=${a}`;
  const headers = async () => {
    const t = (await session?.getToken({ template: 'supabase' })) ?? null;
    return { Authorization: `Bearer ${t}`, apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  };
  const load = useCallback(async () => {
    try {
      const h = await headers() as any;
      const [c, b] = await Promise.all([
        fetch(fnUrl('academy.list'), { headers: h }).then(r => r.json()),
        fetch(fnUrl('academy.badges'), { headers: h }).then(r => r.json()),
      ]);
      setCatalog(c); setBadges(b.badges ?? []);
    } catch (e: any) { setError(e.message); }
  }, [session]);
  useEffect(() => { load(); }, [load]);

  const post = async (action: string, body: any) => {
    const r = await fetch(fnUrl(action), { method: 'POST', headers: await headers() as any, body: JSON.stringify(body) });
    const j = await jres(r);
    if (!r.ok) { setError(j.error); return null; }
    setError(null); return j;
  };
  const openCourse = async (id: string) => {
    const j = await post('academy.course', { course_id: id });
    if (j) setDetail(j);
  };
  const startExam = async (course_id: string, title: string) => {
    const j = await post('academy.exam.start', { course_id });
    if (j) { setExam({ ...j, course_id, title }); setAnswers([]); setResult(null); }
  };
  const submitExam = async () => {
    if (!exam) return;
    const j = await post('academy.exam.submit', { course_id: exam.course_id, answers });
    if (j) { setResult(j); setExam(null); openCourse(exam.course_id); load(); }
  };
  const doVerify = async () => {
    const j = await post('credential.verify', { number: verifyNumber.trim() });
    if (j) setVerifyResult(j);
  };
  const doAppeal = async (attempt_id: string) => {
    const j = await post('academy.appeal', { attempt_id, reason: appealText });
    if (j) { setAppealText(''); openCourse(detail.course.id); }
  };
  const doRenew = async (credential_id: string) => {
    const j = await post('credential.renew', { credential_id });
    if (j) openCourse(detail.course.id);
  };

  const enrolled = (cid: string) => (catalog.enrollments ?? []).find((e: any) => e.course_id === cid);
  const expiredCred = detail?.credential && detail.credential.expires_at && new Date(detail.credential.expires_at) < new Date();

  return (
    <div className="container py-6 space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><GraduationCap className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sparekei Academy</h1>
          <p className="text-xs text-muted-foreground">Eligibility-gated courses · examinations with pass/retake rules · verifiable credentials</p>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {badges.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2"><BadgeCheck className="h-3.5 w-3.5" /> PROFILE BADGES (from active credentials)</p>
          <div className="flex gap-2 flex-wrap">
            {badges.map((b: any) => (
              <Badge key={b.credential_number} className="bg-emerald-100 text-emerald-800 text-[10px] py-1 px-2">
                <BadgeCheck className="h-3 w-3 mr-1" /> {b.courses?.title} · {b.credential_number}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> COURSE CATALOG</p>
          {(catalog.courses ?? []).map((c: any) => {
            const en = enrolled(c.id);
            return (
              <div key={c.id} className="border-b pb-2 last:border-0 space-y-1">
                <button className="text-left w-full" onClick={() => openCourse(c.id)}>
                  <p className="text-sm font-medium hover:text-primary">{c.title}</p>
                </button>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{c.summary}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[9px]">{(c.lessons ?? []).length} modules · pass {(c.pass_mark ?? 70)}% · {(c.max_attempts ?? 3)} attempts</Badge>
                  {en && <Badge className="text-[9px] bg-blue-100 text-blue-800">{en.status} · {en.progress}%</Badge>}
                  {!en && <Button size="sm" variant="outline" className="h-6 text-[11px]"
                    onClick={async () => { await post('academy.enroll', { course_id: c.id }); load(); }}>Enroll</Button>}
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => openCourse(c.id)}>Details</Button>
                </div>
              </div>
            );
          })}
        </Card>

        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> VERIFY A CREDENTIAL</p>
          <div className="flex gap-2">
            <Input value={verifyNumber} onChange={e => setVerifyNumber(e.target.value)} placeholder="SPK-ACAD-XXXXXX" className="h-8 text-xs font-mono" />
            <Button size="sm" className="h-8" onClick={doVerify}>Verify</Button>
          </div>
          {verifyResult && (
            <div className={cn('text-xs p-2 rounded border', verifyResult.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800')}>
              {verifyResult.valid
                ? <>VALID — {verifyResult.holder} · {verifyResult.course} · issued {new Date(verifyResult.issued_at).toLocaleDateString()} · expires {verifyResult.expires_at ? new Date(verifyResult.expires_at).toLocaleDateString() : 'never'}</>
                : 'NOT VALID — unknown, revoked, or expired number'}
            </div>
          )}
        </Card>
      </div>

      {detail && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold">{detail.course.title}</h2>
            {!detail.eligible && <Badge className="text-[10px] bg-rose-100 text-rose-800">Your role is not eligible</Badge>}
            {detail.eligible && !detail.prereq_met && <Badge className="text-[10px] bg-amber-100 text-amber-800">Prerequisite not completed</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{(detail.course.lessons ?? []).map((l: any, i: number) => (
            <span key={i} className="inline-block mr-3">M{i + 1}: {l.title} ({l.minutes}m)</span>
          ))}</p>
          <p className="text-xs">Questions per bank: {detail.question_counts.map((q: any) => `module ${q.module_index}: ${q.count}`).join(' · ') || 'none'} · Attempts used: {detail.attempts_used}/{detail.max_attempts}
            {detail.cooldown_until && new Date(detail.cooldown_until) > new Date() && <> · retake cooldown until {new Date(detail.cooldown_until).toLocaleString()}</>}</p>

          {detail.credential && (
            <div className="flex items-center gap-2 flex-wrap text-xs bg-emerald-50 border border-emerald-200 rounded p-2">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-mono">{detail.credential.credential_number}</span>
              <span>expires {detail.credential.expires_at ? new Date(detail.credential.expires_at).toLocaleDateString() : 'never'}</span>
              {expiredCred && <Badge className="text-[9px] bg-rose-100 text-rose-800">EXPIRED</Badge>}
              <Button size="sm" variant="outline" className="h-6 text-[11px] ml-auto" onClick={() => doRenew(detail.credential.id)}>
                <RefreshCw className="h-3 w-3 mr-1" /> Renew
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8" disabled={!detail.can_exam && !detail.credential}
              onClick={() => startExam(detail.course.id, detail.course.title)}>
              <Play className="h-3.5 w-3.5 mr-1" /> {detail.attempts_used === 0 ? 'Start exam' : 'Retake exam'}
            </Button>
            {!detail.can_exam && !detail.credential && <span className="text-[11px] text-muted-foreground">
              {detail.attempts_used >= detail.max_attempts ? 'Attempts exhausted — appeal below' : 'Not currently exam-eligible (role, prerequisite, or cooldown)'}</span>}
          </div>

          {detail.attempts.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground">ATTEMPT HISTORY</p>
              {detail.attempts.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 text-xs border-b pb-1.5 last:border-0 flex-wrap">
                  <Badge className={cn('text-[9px]', a.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')}>
                    #{a.attempt_no} · {a.score}% {a.passed ? 'PASS' : 'FAIL'}</Badge>
                  <span className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                  {a.appeal_state !== 'NONE' && <Badge variant="outline" className="text-[9px]">appeal: {a.appeal_state}</Badge>}
                  {!a.passed && a.appeal_state === 'NONE' && (
                    <span className="flex gap-1 items-center ml-auto">
                      <Input value={appealText} onChange={e => setAppealText(e.target.value)} placeholder="Appeal reason…" className="h-6 text-[11px] w-44" />
                      <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => doAppeal(a.id)}><ShieldAlert className="h-3 w-3 mr-1" /> Appeal</Button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {exam && (
        <Card className="p-4 space-y-3 border-primary">
          <p className="text-sm font-semibold">Exam — {exam.title} <Badge variant="outline" className="text-[9px] ml-2">attempt {exam.attempt_no} · pass {exam.pass_mark}%</Badge></p>
          {exam.questions.map((q, qi) => (
            <div key={q.n} className="space-y-1">
              <p className="text-sm font-medium">{qi + 1}. {q.q}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {q.choices.map((ch, ci) => (
                  <button key={ci} onClick={() => setAnswers(prev => { const n = [...prev]; n[qi] = ci; return n; })}
                    className={cn('text-left text-xs p-2 rounded border transition',
                      answers[qi] === ci ? 'border-primary bg-primary/10' : 'hover:bg-muted/50')}>
                    {String.fromCharCode(65 + ci)}. {ch}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" onClick={submitExam} disabled={answers.filter(a => a !== undefined).length < exam.questions.length}>
              Submit answers
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExam(null)}>Cancel</Button>
          </div>
        </Card>
      )}

      {result && (
        <Card className={cn('p-4 text-sm', result.passed ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50')}>
          {result.passed
            ? <>PASSED — {result.score}% (pass mark {result.pass_mark}%). Credential issued: <span className="font-mono">{result.credential?.credential_number}</span></>
            : <>FAILED — {result.score}% (pass mark {result.pass_mark}%). {result.attempts_used >= 3 ? 'Attempts exhausted — use the appeal route.' : 'Cooldown applies before retake.'} <RotateCcw className="inline h-3.5 w-3.5 ml-1" /></>}
        </Card>
      )}
    </div>
  );
}
