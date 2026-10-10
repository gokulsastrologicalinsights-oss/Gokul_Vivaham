# Environment Variables Setup

This guide documents all required environment variables for Gokul Vivaham.

## Local Development
Create a `.env.local` file in the root directory:

```env
# NEXT.JS CONFIG
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# SUPABASE CONFIG
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SUPABASE SERVICE ROLE (KEEP SECRET)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# CLOUDFLARE R2 STORAGE (SERVER ONLY)
STORAGE_BACKEND=r2
CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
CLOUDFLARE_R2_URL=https://your_account_id.r2.cloudflarestorage.com
R2_PROFILE_PHOTOS_BUCKET=your_photos_bucket
R2_HOROSCOPES_BUCKET=your_horoscopes_bucket
R2_ID_PROOFS_BUCKET=your_id_proofs_bucket
R2_PHOTO_SIGNED_URL_TTL_SECONDS=180

# RAZORPAY CONFIG
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

## Production Environment
In Vercel (or your hosting provider), ensure the following are securely set:
- Change `NEXT_PUBLIC_SITE_URL` to your production domain (e.g., `https://gokulvivaham.com`).
- Use the production Razorpay keys instead of test keys.
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is completely hidden and not leaked to the frontend.
- Keep every `CLOUDFLARE_R2_*` and `R2_*_BUCKET` variable server-only; never prefix them with `NEXT_PUBLIC_`.
- `R2_PHOTO_SIGNED_URL_TTL_SECONDS` is also server-only and is capped to 30–300 seconds by the application.
