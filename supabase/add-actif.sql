-- eTransMed — Membre actif / retiré (soft)
-- « Retirer » garde le praticien dans la liste (marqué Retiré) mais lui coupe
-- l'accès aux données du cabinet. « Ajouter » le réactive. À exécuter une fois.

alter table public.profiles add column if not exists actif boolean not null default true;

-- Le cabinet courant n'est renvoyé que pour un membre ACTIF -> un retiré perd
-- l'accès aux patients / tournées / transmissions.
create or replace function public.current_cabinet_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select cabinet_id from public.profiles where id = auth.uid() and actif $$;
