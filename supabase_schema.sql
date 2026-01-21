-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Enums
create type public.currency_code as enum ('EUR', 'USD', 'GBP');
create type public.template_type as enum ('basic', 'minimal', 'modern');

-- Projects Table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  template_id public.template_type default 'basic',
  settings jsonb default '{"show_prices": true, "show_descriptions": true, "show_specs": true}'::jsonb,
  catalog_ai_metadata jsonb default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete cascade not null
);

-- Categories Table (Per Project)
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  unique(project_id, name)
);

-- Products Table (Robust)
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Core Data
  title text not null,
  description text,
  price numeric default 0,
  currency public.currency_code default 'EUR',
  
  -- Media & Links
  image_url text,
  images text[] default array[]::text[], -- Store multiple images
  original_url text,
  
  -- Organization
  category_id uuid references public.categories(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade not null,
  
  -- AI & Attributes
  attributes jsonb default '{}'::jsonb, -- e.g. { "color": "blue", "material": "wood" }
  specifications jsonb default '{}'::jsonb, -- e.g. { "dimensions": "10x10", "weight": "1kg" }
  ai_metadata jsonb default '{}'::jsonb, -- e.g. { "detected_style": "modern", "confidence": 0.9 }
  
  -- State
  is_visible boolean default true,
  sort_order integer default 0
);

-- PDF Exports Table
create table public.pdf_exports (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  download_url text not null,
  template_used public.template_type not null
);

-- Indexes
create index idx_projects_user_id on public.projects(user_id);
create index idx_products_project_id on public.products(project_id);
create index idx_products_category_id on public.products(category_id);
create index idx_categories_project_id on public.categories(project_id);

-- RLS Policies
alter table public.projects enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.pdf_exports enable row level security;

-- Projects
create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

-- Categories
create policy "Users can view categories of own projects" on public.categories for select using (
  exists (select 1 from public.projects where id = categories.project_id and user_id = auth.uid())
);
create policy "Users can insert categories to own projects" on public.categories for insert with check (
  exists (select 1 from public.projects where id = categories.project_id and user_id = auth.uid())
);
create policy "Users can update categories of own projects" on public.categories for update using (
  exists (select 1 from public.projects where id = categories.project_id and user_id = auth.uid())
);
create policy "Users can delete categories of own projects" on public.categories for delete using (
  exists (select 1 from public.projects where id = categories.project_id and user_id = auth.uid())
);

-- Products
create policy "Users can view products of own projects" on public.products for select using (
  exists (select 1 from public.projects where id = products.project_id and user_id = auth.uid())
);
create policy "Users can insert products to own projects" on public.products for insert with check (
  exists (select 1 from public.projects where id = products.project_id and user_id = auth.uid())
);
create policy "Users can update products of own projects" on public.products for update using (
  exists (select 1 from public.projects where id = products.project_id and user_id = auth.uid())
);
create policy "Users can delete products of own projects" on public.products for delete using (
  exists (select 1 from public.projects where id = products.project_id and user_id = auth.uid())
);

-- PDF Exports
create policy "Users can view own exports" on public.pdf_exports for select using (auth.uid() = user_id);
create policy "Users can insert own exports" on public.pdf_exports for insert with check (auth.uid() = user_id);

-- Storage Buckets (Idempotent)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('catalogs', 'catalogs', true) on conflict (id) do nothing;

-- Storage Policies (Simplified for brevity, assume auth check)
create policy "Authenticated users can upload product images" on storage.objects
  for insert with check ( bucket_id = 'product-images' and auth.role() = 'authenticated' );
create policy "Authenticated users can upload catalogs" on storage.objects
  for insert with check ( bucket_id = 'catalogs' and auth.role() = 'authenticated' );
create policy "Public Access to Product Images" on storage.objects
  for select using ( bucket_id = 'product-images' );
create policy "Public Access to Catalogs" on storage.objects
  for select using ( bucket_id = 'catalogs' );

-- Moodboards Table
create table public.moodboards (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null default 'Moodboard',
  image_url text not null,
  product_ids uuid[] not null,
  settings jsonb default '{}'::jsonb
);

-- Moodboards RLS
alter table public.moodboards enable row level security;

create policy "Users can view moodboards of own projects" on public.moodboards for select using (
  exists (select 1 from public.projects where id = moodboards.project_id and user_id = auth.uid())
);
create policy "Users can insert moodboards to own projects" on public.moodboards for insert with check (
  exists (select 1 from public.projects where id = moodboards.project_id and user_id = auth.uid())
);
create policy "Users can delete moodboards of own projects" on public.moodboards for delete using (
  exists (select 1 from public.projects where id = moodboards.project_id and user_id = auth.uid())
);

-- Storage for Moodboards
insert into storage.buckets (id, name, public) values ('moodboards', 'moodboards', true) on conflict (id) do nothing;

create policy "Authenticated users can upload moodboards" on storage.objects
  for insert with check ( bucket_id = 'moodboards' and auth.role() = 'authenticated' );
create policy "Public Access to Moodboards" on storage.objects
  for select using ( bucket_id = 'moodboards' );
