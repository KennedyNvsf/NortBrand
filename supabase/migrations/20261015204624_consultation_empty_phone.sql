-- An empty phone means "no phone" (#37). Generated Supabase types make every function
-- argument a non-null string, so the server action sends '' instead of null; the
-- function stores null either way. Same signature, so grants are unchanged.
create or replace function public.submit_consultation_request(
  p_name text,
  p_email text,
  p_phone text,
  p_service text,
  p_message text,
  p_locale text,
  p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  perform private.enforce_write_limit(p_ip_hash, 'consultation');

  insert into public.consultation_requests
    (name, email, phone, service, message, locale, consent_at, ip_hash)
  values
    (p_name, p_email, nullif(btrim(p_phone), ''), p_service, p_message, p_locale, now(), p_ip_hash)
  returning id into new_id;

  return new_id;
end;
$$;
