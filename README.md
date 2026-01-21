# Kattlog - AI-Powered Product Catalog Creator

Transform any e-commerce website into beautiful, professional catalogs in seconds.

## 🚀 Features

- **Smart Product Scraping**: Extract products from any e-commerce site with AI-powered detection
- **Category Detection**: Automatically identifies and organizes product categories
- **Visual Catalog Editor**: Drag-and-drop interface for creating stunning catalogs
- **Multiple Export Formats**:
  - PDF (print-ready)
  - Excel (with embedded images)
  - InDesign (IDML for professional editing)
  - Photoshop (PSD with layers)
  - SVG (for Illustrator)
  - PNG (high-resolution images)
- **Moodboard Creator**: Design custom product layouts with AI assistance
- **Product Detail Extraction**: Automatically captures dimensions, materials, descriptions, and more

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **Scraping**: Puppeteer + Firecrawl
- **Styling**: Tailwind CSS
- **Exports**: ExcelJS, jsPDF, ag-psd

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/katalog.git
cd katalog
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_key (optional)
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Create projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Create products table
create table products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  title text not null,
  price numeric,
  currency text default 'EUR',
  image_url text,
  original_url text,
  description text,
  specifications jsonb,
  attributes jsonb,
  ai_metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Create moodboards table
create table moodboards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects not null,
  name text not null,
  image_url text,
  settings jsonb,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table projects enable row level security;
alter table products enable row level security;
alter table moodboards enable row level security;

-- Create policies
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

-- Similar policies for products and moodboards...
```

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Custom Domain Setup

1. Add your domain in Vercel dashboard
2. Update DNS records at your registrar
3. Wait for SSL certificate provisioning

## 🎨 Usage

1. **Create a Project**: Start by creating a new project
2. **Add Products**: Enter any e-commerce URL to scrape products
3. **Select Categories**: Choose which categories to import
4. **Review Products**: View and edit product details
5. **Create Catalog**: Use the visual editor to arrange products
6. **Export**: Download in your preferred format

## 🔒 Security

- All API keys are stored securely in environment variables
- Row Level Security (RLS) enabled on all database tables
- Authentication handled by Supabase Auth
- CORS configured for production domain

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

For support, email support@kattlog.com

---

Built with ❤️ for designers and e-commerce professionals
