# Supabase Database Setup

This guide helps you set up the database for the Schelling Point app.

## Option 1: Cloud Supabase (Production)

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Run Migrations
In the Supabase SQL Editor, run the contents of:
- `migrations/20260205000000_mvp_schema.sql` - Creates all tables, functions, triggers, and RLS policies

### 3. (Optional) Seed Data
Run `seed.sql` to populate sample venues and time slots.

### 4. Configure Auth
In Supabase Dashboard > Authentication > URL Configuration:
- **Site URL**: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- **Redirect URLs**: Add your URLs:
  - `https://your-app.vercel.app/**`
  - `http://localhost:3000/**` (for local dev)

### 5. Configure Email (SMTP)
In Authentication > SMTP Settings, configure your email provider:
- **Resend**: Host `smtp.resend.com`, Port `587`, User `resend`, Password: your API key

### 6. Environment Variables
Create `.env.local` in the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Option 2: Local Supabase (Development)

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Start Local Supabase
```bash
cd mvp
supabase start
```

This will:
- Start PostgreSQL on port 54322
- Start Supabase Studio on port 54323
- Start API on port 54321
- Run migrations automatically
- Run seed.sql automatically

### 3. Environment Variables
Use the local development keys (from `supabase start` output):
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. View Local Emails
Magic link emails are captured at http://localhost:54324 (Inbucket)

## Making a User Admin

After a user signs up, make them an admin by running in SQL Editor:
```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'user@example.com';
```

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends auth.users) |
| `sessions` | Session proposals |
| `votes` | User votes on sessions (quadratic) |
| `favorites` | Saved/favorited sessions |
| `venues` | Event locations/rooms |
| `time_slots` | Schedule time blocks |

## Key Triggers

- `on_auth_user_created`: Auto-creates profile when user signs up
- `on_vote_change`: Updates session vote counts when votes change
