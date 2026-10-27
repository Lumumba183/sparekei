# Sparekei AI — Intent & Tool Registry (spec 13.4)

## Concierge (all users) — model: OpenAI GPT-4.1-mini
Intents: part_identification · symptom · marketplace_search · provider_discovery · booking · vehicle_history · general
Tools (permission-checked, audit-logged):
| tool | scope | data |
|---|---|---|
| my_vehicles | caller only | vehicles table |
| my_bookings | caller only | bookings + quote |
| search_offers | public offers | seller_offers (PUBLISHED, public) |
| my_passport | caller's vehicles | passport_stamps |
| find_providers | verified only | provider_capabilities (PLATFORM_CHECKED+) |
Limits: 20/min, 150/day per user (DB-backed, cross-isolate). Cache: 15 min, safe intents only. Fallback: 1 retry, then honest 502. Cost: every call logs tokens+cost to ai_costs.

## AI Brain (admin only) — model: OpenAI GPT-4.1
Tools: list_tables · query_table (31 whitelisted tables, exact-match filters only, max 25 rows, identifier validation).
Output: answer + visible reasoning trace (tool, args, rows per step) + Sources line. Limits: 15/min, 300/day. All queries logged via ai_costs + audit trail.

## Boundaries (never violated)
No fabricated data · no completed-action claims · no numeric confidence without calibration · tool writes: none (read-only agents) · every action audited.
