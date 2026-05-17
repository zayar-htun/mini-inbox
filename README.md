# PropPilot Inbox

Started from:

npm create vite@latest --template react-ts

## Run locally

npm install
npm run dev

## Supabase setup

This project uses [Supabase](https://supabase.com) for its backend.

1. Copy `.env.example` to `.env`:

   ```
   cp .env.example .env
   ```

2. Fill in the values from your Supabase project (Project Settings → API):

   - `VITE_SUPABASE_URL` — your project URL
   - `VITE_SUPABASE_ANON_KEY` — your public anon key

3. Import the client where you need it:

   ```ts
   import { supabase } from './lib/supabase';
   ```

The app will throw a descriptive error at startup if either env var is missing. `.env` is gitignored — never commit real credentials.