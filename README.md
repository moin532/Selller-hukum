# Hukum — Seller Admin

Seller portal for Hukum B2B (`seller-admin` only).

## Production / Cloudhost

Out of the box this app talks to the **live Hukum API**:

- Browser → same-origin `/api/*`
- Next.js rewrite → `https://api.hukum-ksa.com`
- Marketplace assets → `https://hukum-ksa.com`

```bash
npm install
cp .env.example .env.local   # optional; defaults already point at production
npm run build
npm start                    # http://localhost:3002
```

Cloudhost: set Node start to `npm start` (or `npx next start -p $PORT`). No local Backend required.

| Env | Purpose |
|-----|---------|
| `HUKUM_API_URL` | Rewrite target (default `https://api.hukum-ksa.com`) |
| `NEXT_PUBLIC_MARKETPLACE_URL` | Storefront / category images (`https://hukum-ksa.com`) |
| `NEXT_PUBLIC_API_URL` | Optional local Backend override only |

## Local with Backend

```bash
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 npm run dev
```

App: **http://localhost:3002**

## Stack

- Next.js 15.5 (App Router), React 19, JavaScript/JSX
- Tailwind CSS 4
- Bearer JWT against Hukum `/api/auth`

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Seller login |
| `/dashboard` | Overview |
| `/dashboard/company-profile` | Vendor profile |
| `/dashboard/products` | Catalogue |
| `/dashboard/rfqs` | Invited RFQs |
| `/dashboard/quotations` | Quotes |
| `/dashboard/storefront` | Public storefront |
| `/dashboard/analytics` | Metrics |
| `/dashboard/settings` | Theme / language / logout |
