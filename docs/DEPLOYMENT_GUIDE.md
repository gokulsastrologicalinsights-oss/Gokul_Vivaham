# Deployment Guide

This document outlines the steps to deploy Gokul Vivaham to production using Vercel and Supabase.

## 1. Backend Deployment (Supabase)
1. Log in to [Supabase](https://supabase.com/).
2. Create a new project.
3. Obtain your `Project URL` and `Anon Key`.
4. Run all SQL migration files located in `supabase/migrations/` sequentially in the Supabase SQL Editor.
   - Start with `20260621151500_scalable_matrimony_schema.sql`
   - End with `20260621190000_production_indexes.sql`

## 2. Payment Gateway (Razorpay)
1. Go to your Razorpay Dashboard.
2. Switch to **Live Mode**.
3. Generate new Live API Keys (`Key ID` and `Key Secret`).
4. Setup a webhook pointing to `https://yourdomain.com/api/razorpay/webhook`.

## 3. Frontend Deployment (Vercel)
1. Push your code to a GitHub repository.
2. Log in to [Vercel](https://vercel.com/) and create a new project.
3. Import your GitHub repository.
4. Expand the **Environment Variables** section and add all variables listed in `docs/ENVIRONMENT_VARIABLES.md`.
5. Click **Deploy**. Vercel will automatically detect Next.js and build the application.

## 4. Post-Deployment Checks
- Verify that authenticated image/document uploads reach the private R2 buckets and that Supabase metadata, RLS, and protected downloads still enforce member privacy. See `docs/R2_STORAGE_MIGRATION.md`.
- Ensure the production URL is updated in Razorpay Webhooks.
- Test user registration and the subscription checkout flow.
