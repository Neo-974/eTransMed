-- eTransMed — Rôle « admin » + droits de gestion (admin OU titulaire)
-- À exécuter une fois. Idempotent.

-- Ajoute la valeur 'admin' au type des rôles
alter type public.user_role add value if not exists 'admin';

-- Manager = titulaire OU admin (role::text pour éviter tout souci d'enum)
create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role::text in ('titulaire', 'admin') from public.profiles where id = auth.uid()),
    false)
$$;

-- La policy de gestion des profils autorise désormais admin + titulaire
drop policy if exists "profiles_titulaire_update" on public.profiles;
drop policy if exists "profiles_manager_update" on public.profiles;
create policy "profiles_manager_update" on public.profiles
  for update
  using (cabinet_id = public.current_cabinet_id() and public.is_manager())
  with check (cabinet_id = public.current_cabinet_id() or cabinet_id is null);
