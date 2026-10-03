create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  whatsapp text not null,
  slot_start timestamptz not null,
  status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create unique index if not exists bookings_active_slot_unique
on public.bookings(slot_start) where status='confirmed';

alter table public.bookings enable row level security;

-- No public SELECT access. The public calendar uses the safe RPC below,
-- which returns ONLY occupied slot times.
drop policy if exists "public can read confirmed slots" on public.bookings;
drop policy if exists "admin can read bookings" on public.bookings;

create policy "admin can read bookings"
on public.bookings for select to authenticated
using ((auth.jwt() ->> 'email') = 'ahmjoyuchechi@gmail.com');

create or replace function public.get_booked_slots(p_from timestamptz, p_to timestamptz)
returns table(slot_start timestamptz)
language sql
security definer
set search_path=public
as $$
  select b.slot_start
  from public.bookings b
  where b.status='confirmed'
    and b.slot_start >= p_from
    and b.slot_start <= p_to
  order by b.slot_start;
$$;

grant execute on function public.get_booked_slots(timestamptz,timestamptz) to anon,authenticated;

create or replace function public.create_booking(
  p_name text,
  p_email text,
  p_whatsapp text,
  p_slot_start text
)
returns json
language plpgsql
security definer
set search_path=public
as $$
declare
  v_start timestamptz;
  v_dow int;
  v_time time;
  v_name text := trim(p_name);
  v_email text := lower(trim(p_email));
  v_whatsapp text := trim(p_whatsapp);
  v_id uuid;
begin
  if length(v_name) < 2 then return json_build_object('error','Please enter your full name.'); end if;
  if v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then return json_build_object('error','Please enter a valid email address.'); end if;
  if length(v_whatsapp) < 7 then return json_build_object('error','Please enter a valid WhatsApp number.'); end if;

  v_start := p_slot_start::timestamptz;
  v_dow := extract(isodow from v_start at time zone 'Africa/Lagos');
  v_time := (v_start at time zone 'Africa/Lagos')::time;

  if v_dow not in (1,3,5) then return json_build_object('error','That date is not available.'); end if;
  if v_time not in ('16:00:00','16:30:00') then return json_build_object('error','That time is not available.'); end if;
  if v_start <= now() then return json_build_object('error','That time has already passed.'); end if;

  insert into public.bookings(name,email,whatsapp,slot_start)
  values(v_name,v_email,v_whatsapp,v_start)
  returning id into v_id;

  return json_build_object('ok',true,'booking_id',v_id,'name',v_name,'email',v_email,'whatsapp',v_whatsapp,'slot_start',v_start);
exception when unique_violation then
  return json_build_object('error','That slot was just booked by someone else. Please choose another time.');
end;
$$;

revoke all on function public.create_booking(text,text,text,text) from public;
grant execute on function public.create_booking(text,text,text,text) to anon,authenticated;

-- The private dashboard is limited to the authenticated Coach Joy email above.
