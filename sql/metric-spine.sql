-- metric-spine.sql
-- Source of truth for the Evidence DNA metric spine instrument.
-- Applied to prod as the view public.v_metric_spine (migration: create_metric_spine_view).
--
-- WHAT THIS IS: one read-only instrument that computes the BPP funnel from CRM
-- truth (Supabase). Aggregates only, no PII. security_invoker=true so it
-- respects base-table RLS (service role / authenticated operator reads; anon
-- cannot). Read it from anywhere with: SELECT * FROM public.v_metric_spine ORDER BY ord;
--
-- WHAT IS NOT HERE (connector-gated, PostHog Path A, task #83):
--   - CPL / ad spend / impressions / clicks  -> Meta connector
--   - authoritative cleared revenue           -> Stripe connector
--   - top-of-funnel (impression->click->landing->form-start) -> PostHog events
-- The CRM view covers capture -> quote -> sign -> install + cycle time + the
-- instrumentation-gap flags. Wire the gated cells in once Path A lands.
--
-- Reversible: DROP VIEW public.v_metric_spine;

CREATE OR REPLACE VIEW public.v_metric_spine WITH (security_invoker = true) AS
SELECT * FROM (VALUES
  (1,'leads_total_active','funnel',(SELECT count(*) FROM contacts WHERE archived IS NOT TRUE)::numeric,'all','active (non-archived) contacts = leads in pipeline'),
  (2,'leads_7d','funnel',(SELECT count(*) FROM contacts WHERE archived IS NOT TRUE AND created_at>now()-interval '7 days')::numeric,'7d','new leads last 7 days'),
  (3,'leads_30d','funnel',(SELECT count(*) FROM contacts WHERE archived IS NOT TRUE AND created_at>now()-interval '30 days')::numeric,'30d','new leads last 30 days'),
  (4,'quoted_distinct','funnel',(SELECT count(DISTINCT contact_id) FROM proposals WHERE sent_at IS NOT NULL AND superseded_by IS NULL)::numeric,'all','distinct contacts who received a sent proposal'),
  (5,'signed_distinct','funnel',(SELECT count(DISTINCT contact_id) FROM proposals WHERE signed_at IS NOT NULL)::numeric,'all','distinct contacts who signed a proposal'),
  (6,'signed_30d','funnel',(SELECT count(*) FROM proposals WHERE signed_at>now()-interval '30 days')::numeric,'30d','proposals signed last 30 days'),
  (7,'installs_scheduled','funnel',(SELECT count(*) FROM schedule)::numeric,'all','install appointments on the schedule'),
  (8,'installs_recorded','funnel',(SELECT count(*) FROM contacts WHERE install_date IS NOT NULL)::numeric,'all','contacts with install_date set [GAP: under-recorded vs scheduled]'),
  (9,'signed_value_all','money',(SELECT coalesce(sum(total),0) FROM proposals WHERE signed_at IS NOT NULL)::numeric,'all','dollar value of all signed proposals'),
  (10,'signed_value_30d','money',(SELECT coalesce(sum(total),0) FROM proposals WHERE signed_at>now()-interval '30 days')::numeric,'30d','signed value last 30 days'),
  (11,'invoices_paid_sum','money',(SELECT coalesce(sum(total),0) FROM invoices WHERE paid_at IS NOT NULL OR status='paid')::numeric,'all','invoice $ marked paid [GAP: reconciliation vs signed]'),
  (12,'payments_sum','money',(SELECT coalesce(sum(amount),0) FROM payments)::numeric,'all','recorded payments total'),
  (13,'median_days_lead_to_quote','velocity',(SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (p.sent_at-c.created_at))/86400)::numeric,1) FROM proposals p JOIN contacts c ON c.id=p.contact_id WHERE p.sent_at IS NOT NULL),'all','median days lead created to proposal sent'),
  (14,'median_days_quote_to_sign','velocity',(SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(epoch FROM (p.signed_at-p.sent_at))/86400)::numeric,1) FROM proposals p WHERE p.signed_at IS NOT NULL AND p.sent_at IS NOT NULL),'all','median days proposal sent to signed'),
  (15,'leads_attributed','gap',(SELECT count(*) FROM contacts WHERE archived IS NOT TRUE AND lead_channel IS NOT NULL)::numeric,'all','active leads with a channel set [GAP: attribution unpopulated]'),
  (16,'gbp_reviews','gap',(SELECT count(*) FROM gbp_reviews)::numeric,'all','GBP reviews stored [GAP: growth-loop terminal metric not instrumented]')
) AS t(ord,metric,section,value,period,note);

COMMENT ON VIEW public.v_metric_spine IS 'Evidence DNA metric spine. Read-only funnel instrument from CRM truth. CPL/spend (Meta) and authoritative cleared revenue (Stripe) are connector-gated and NOT here. Defined in brain/14-evidence-dna.md + sql/metric-spine.sql.';
