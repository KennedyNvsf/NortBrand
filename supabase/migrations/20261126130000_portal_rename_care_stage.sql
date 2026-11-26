-- The stage after launch is called "Support", matching the client portal's copy (#77,
-- lead 2026-11-26). Only the stage template changes: new projects get "Support";
-- stages of existing projects keep their name, and the team can rename them.
-- The template is otherwise edited in Team → Settings (#159), so rename only the row
-- still carrying the seeded name.
update public.portal_stage_template
set name = 'Support'
where kind = 'after'
  and name = 'Care';
