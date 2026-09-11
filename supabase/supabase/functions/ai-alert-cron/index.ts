// SPAREKEI PREDICTIVE ALERTS — deterministic, explainable heuristics over
// verified data. No black box: every alert names its source rows.
// v1 is fully deterministic (no LLM) by design; insights go to the Reasoning Console.
import { cors, requireAdmin, HttpError } from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { supabase } = await requireAdmin(req);
    const alerts: { alert_type: string; severity: string; title: string; message: string; source_refs: any[] }[] = [];
    const now = Date.now();

    // 1. Maintenance due: vehicle with no passport stamp in > 180 days
    const { data: staleVehicles } = await supabase.from('vehicles')
      .select('id, make, model, registration, mileage_km, owner:app_users!vehicles_owner_id_fkey(full_name)').eq('is_active', true).limit(200);
    const { data: recentStamps } = await supabase.from('passport_stamps')
      .select('vehicle_id, stamped_at').gte('stamped_at', new Date(now - 180 * 864e5).toISOString());
    const stamped = new Set((recentStamps ?? []).map((s: any) => s.vehicle_id));
    for (const v of staleVehicles ?? []) {
      if (!stamped.has(v.id)) {
        alerts.push({
          alert_type: 'maintenance_due', severity: 'warning',
          title: `${v.make} ${v.model} (${v.registration ?? 'no plate'}) may be due for service`,
          message: `No verified service stamp in the last 180 days. Owner: ${(v as any).owner?.full_name ?? 'unknown'}. Mileage: ${v.mileage_km.toLocaleString()} km.`,
          source_refs: [{ table: 'vehicles', id: v.id }],
        });
      }
    }

    // 2. Stockout risk: listings below 10 units
    const { data: lowStock } = await supabase.from('marketplace_listings')
      .select('id, part_sku, part_name, stock_level').lt('stock_level', 10);
    for (const l of lowStock ?? []) {
      alerts.push({
        alert_type: 'stockout_risk', severity: 'info',
        title: `Low stock: ${l.part_name} (${l.part_sku})`,
        message: `Only ${l.stock_level} units remain. Consider restocking or raising price.`,
        source_refs: [{ table: 'marketplace_listings', id: l.id }],
      });
    }

    // 3. Rating decay: nodes below 4.2
    const { data: weakNodes } = await supabase.from('service_nodes')
      .select('id, business_name, rating, reviews_count').lt('rating', 4.2);
    for (const n of weakNodes ?? []) {
      alerts.push({
        alert_type: 'rating_decay', severity: 'warning',
        title: `${n.business_name} rating is ${n.rating} (${n.reviews_count} reviews)`,
        message: 'Below the 4.2 quality threshold. Consider a quality audit or support.',
        source_refs: [{ table: 'service_nodes', id: n.id }],
      });
    }

    // 4. Demand spike: >=3 orders in 7 days on one node
    const { data: hotNodes } = await supabase.from('service_orders')
      .select('node_id, service_nodes(business_name)')
      .gte('created_at', new Date(now - 7 * 864e5).toISOString());
    const counts = new Map<string, number>();
    for (const o of hotNodes ?? []) counts.set(o.node_id, (counts.get(o.node_id) ?? 0) + 1);
    for (const [nodeId, count] of counts) {
      if (count >= 3) {
        const name = (hotNodes ?? []).find((o: any) => o.node_id === nodeId)?.service_nodes?.business_name ?? nodeId;
        alerts.push({
          alert_type: 'demand_spike', severity: 'info',
          title: `Demand spike at ${name}: ${count} orders in 7 days`,
          message: 'Consider promoting this node or guaranteeing bay availability.',
          source_refs: [{ table: 'service_orders', node_id: nodeId }],
        });
      }
    }

    // De-dupe against pending alerts, then insert
    const { data: pending } = await supabase.from('ai_alerts').select('alert_type, title').eq('status', 'pending');
    const existing = new Set((pending ?? []).map((a: any) => `${a.alert_type}:${a.title}`));
    const fresh = alerts.filter(a => !existing.has(`${a.alert_type}:${a.title}`));
    if (fresh.length) await supabase.from('ai_alerts').insert(fresh);

    return Response.json({ scanned: alerts.length, inserted: fresh.length, skipped_duplicates: alerts.length - fresh.length }, { headers: cors });
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    return Response.json({ error: e.message ?? 'Internal error' }, { status, headers: cors });
  }
});
