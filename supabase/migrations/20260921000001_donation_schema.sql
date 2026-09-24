-- Схема динамічних варіантів пожертви, способів оплати, адмінів і аудиту.

create extension if not exists pgcrypto;

-- ---------- Адміни ----------
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

-- ---------- Варіанти пожертви ----------
create table public.donation_options (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  description text check (length(description) <= 300),
  icon text check (length(icon) <= 40),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);
create index donation_options_active_sort_idx on public.donation_options (is_active, sort_order);

-- ---------- Способи оплати ----------
create table public.donation_payment_methods (
  id uuid primary key default gen_random_uuid(),
  donation_option_id uuid not null references public.donation_options(id) on delete cascade,
  method text not null check (method in ('online', 'card')),
  is_active boolean not null default true,
  -- лише HTTPS; додаткова перевірка домену виконується на сервері (allowlist)
  payment_url text check (payment_url is null or payment_url ~* '^https://[^[:space:]]+$'),
  card_number text check (card_number is null or card_number ~ '^[0-9 ]{12,23}$'),
  recipient_name text check (length(recipient_name) <= 120),
  payment_description text check (length(payment_description) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (donation_option_id, method)
);

-- ---------- Універсальний аудит ----------
create table public.donation_audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,             -- donation_options | donation_payment_methods
  entity_id uuid not null,
  donation_option_id uuid,
  action text not null,                  -- insert | update | delete
  changes jsonb not null default '{}',   -- { поле: { old, new } }
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index donation_audit_log_changed_at_idx on public.donation_audit_log (changed_at desc);

-- ---------- Тригери ----------
create or replace function public.set_audit_fields()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;

create trigger donation_options_audit_fields before insert or update on public.donation_options
  for each row execute function public.set_audit_fields();
create trigger donation_payment_methods_audit_fields before insert or update on public.donation_payment_methods
  for each row execute function public.set_audit_fields();

-- Лог змін: хто, що, коли. Службові поля не логуються.
create or replace function public.log_donation_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  n jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  diff jsonb := '{}'::jsonb;
  k text;
  rec jsonb := case when tg_op = 'DELETE' then o else n end;
begin
  for k in select jsonb_object_keys(o || n) loop
    if k in ('created_at', 'updated_at', 'created_by', 'updated_by') then continue; end if;
    if o -> k is distinct from n -> k then
      diff := diff || jsonb_build_object(k, jsonb_build_object('old', o -> k, 'new', n -> k));
    end if;
  end loop;
  if tg_op = 'UPDATE' and diff = '{}'::jsonb then return new; end if;
  insert into public.donation_audit_log (entity_type, entity_id, donation_option_id, action, changes, changed_by)
  values (
    tg_table_name,
    (rec ->> 'id')::uuid,
    case when tg_table_name = 'donation_options' then (rec ->> 'id')::uuid else (rec ->> 'donation_option_id')::uuid end,
    lower(tg_op), diff, auth.uid()
  );
  return coalesce(new, old);
end $$;

create trigger donation_options_log after insert or update or delete on public.donation_options
  for each row execute function public.log_donation_change();
create trigger donation_payment_methods_log after insert or update or delete on public.donation_payment_methods
  for each row execute function public.log_donation_change();

-- ---------- RLS ----------
alter table public.admin_users enable row level security;
alter table public.donation_options enable row level security;
alter table public.donation_payment_methods enable row level security;
alter table public.donation_audit_log enable row level security;

-- Публічне читання: тільки активні варіанти та активні способи оплати.
create policy "public read active options" on public.donation_options
  for select to anon, authenticated using (is_active);
create policy "public read active methods" on public.donation_payment_methods
  for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.donation_options o where o.id = donation_option_id and o.is_active));

-- Адміни: повний доступ (та бачать неактивні записи).
create policy "admin all options" on public.donation_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all methods" on public.donation_payment_methods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin read audit" on public.donation_audit_log
  for select to authenticated using (public.is_admin());
create policy "read own admin row" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

-- Права на рівні колонок: anon НЕ бачить payment_url та службові поля.
revoke all on public.donation_options, public.donation_payment_methods,
  public.donation_audit_log, public.admin_users from anon, authenticated;

grant select (id, title, description, icon, is_active, sort_order) on public.donation_options to anon;
grant select (id, donation_option_id, method, is_active, card_number, recipient_name, payment_description)
  on public.donation_payment_methods to anon;

grant select, insert, update, delete on public.donation_options, public.donation_payment_methods to authenticated;
grant select on public.donation_audit_log, public.admin_users to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
