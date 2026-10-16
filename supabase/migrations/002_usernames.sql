begin;

create table if not exists public.account_usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  constraint valid_username check (username ~ '^[a-z0-9_]{3,24}$')
);
alter table public.account_usernames enable row level security;
revoke all on public.account_usernames from public, anon, authenticated;
grant select, insert, update, delete on public.account_usernames to service_role;

-- Reserve signup usernames in the same transaction as the auth account.
-- Existing magic-link users can choose theirs later from My Plans.
create or replace function public.reserve_signup_username()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ->> 'username' is not null then
    insert into public.account_usernames(user_id, username)
    values (new.id, lower(trim(new.raw_user_meta_data ->> 'username')));
  end if;
  return new;
end;
$$;
revoke all on function public.reserve_signup_username() from public, anon, authenticated;
drop trigger if exists planr_signup_username on auth.users;
create trigger planr_signup_username after insert on auth.users
for each row execute function public.reserve_signup_username();

commit;
