# Assumption Roam Rent

Vehicle rental platform with customer browsing and booking, owner tools for listings and availability, and admin dashboards for review, disputes, users, and audit logs.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase (Database + Storage)
- Lucide React (icons)

## Features

- Public vehicle catalog with filters and detailed booking flow
- Customer bookings, reviews, and support disputes
- Vehicle owner dashboard for listings, bookings, earnings, and availability management
- Admin dashboards for vehicles, bookings, users, disputes, reviews, and identity verification
- Supabase storage for profile avatars and vehicle images

## Project Structure

- app: App Router pages and dashboards
- components: Shared UI components
- lib: Supabase client utilities and role helpers

## Requirements

- Node.js 18+ (recommended)
- Supabase project with database tables and storage buckets

## Environment Variables

Create a `.env` file in the project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key
```

## Database Schema

- SQL schema is in [schema.sql](file:///d:/assumption-roam-rent/app/schema.sql)
- Create these Supabase storage buckets:
  - profile
  - vehicles

## Setup

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000

## Scripts

- npm run dev: Start development server
- npm run build: Production build
- npm run start: Run production server
- npm run lint: ESLint checks

## Notes

- Auth is currently handled via localStorage and public.users table
- Role values used by the UI: customer, vehicle-owner, admin, car-owner
