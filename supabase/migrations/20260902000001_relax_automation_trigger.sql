-- The section-7 trigger list ("Appointment completed", "Webhook trigger",
-- etc.) describes what fires a patient-facing ReviewFlow send. Not every
-- automation in the existing mock set is that kind of automation — some are
-- internal escalation/alerting rules (e.g. "1-2 star feedback received",
-- "Review velocity drops") that don't fit that enum at all. Rather than
-- force a wrong value into a constrained column, widen it to free text and
-- keep the section-7 list as the documented common set for send-triggered
-- automations specifically.
alter table public.automations drop constraint automations_trigger_condition_check;

comment on column public.automations.trigger_condition is
  'Free text. For patient-facing send automations, use one of: Appointment completed, Treatment completed, Follow-up completed, Invoice paid, Patient marked eligible, Manual trigger, Webhook trigger, Import trigger (section 7). Escalation/alerting automations describe their own trigger condition in plain language instead.';
