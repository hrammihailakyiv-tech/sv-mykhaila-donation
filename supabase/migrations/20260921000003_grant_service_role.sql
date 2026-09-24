-- Edge Function ходить у БД як service_role (обходить RLS, але потребує GRANT).
-- Без цього запити функції давали 42501 "permission denied for table ...".
grant usage on schema public to service_role;
grant select, insert, update, delete on
  public.donation_options,
  public.donation_payment_methods,
  public.donation_audit_log,
  public.admin_users
to service_role;
