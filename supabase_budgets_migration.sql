-- Budgets Table
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null default 'Presupuesto',
  file_url text not null,
  product_ids uuid[] not null,
  total numeric default 0,
  line_items jsonb default '[]'::jsonb,
  settings jsonb default '{}'::jsonb
);

-- Indexes
create index idx_budgets_project_id on public.budgets(project_id);

-- RLS
alter table public.budgets enable row level security;

create policy "Users can view budgets of own projects" on public.budgets for select using (
  exists (select 1 from public.projects where id = budgets.project_id and user_id = auth.uid())
);
create policy "Users can insert budgets to own projects" on public.budgets for insert with check (
  exists (select 1 from public.projects where id = budgets.project_id and user_id = auth.uid())
);
create policy "Users can delete budgets of own projects" on public.budgets for delete using (
  exists (select 1 from public.projects where id = budgets.project_id and user_id = auth.uid())
);

-- Storage bucket for budget files
insert into storage.buckets (id, name, public) values ('budgets', 'budgets', true) on conflict (id) do nothing;

create policy "Authenticated users can upload budgets" on storage.objects
  for insert with check ( bucket_id = 'budgets' and auth.role() = 'authenticated' );
create policy "Public Access to Budgets" on storage.objects
  for select using ( bucket_id = 'budgets' );
