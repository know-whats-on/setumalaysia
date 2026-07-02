# Senang AU

Senang AU is a Bahasa Malaysia-first student life and arrival support app for Malaysians in Australia.

This repository is the dedicated web deployment source for `https://malaysia.knowwhatson.com`.

## Local Development

```bash
npm ci
npm run dev
```

## Production Build

```bash
npm run build:jom-settle
```

The build writes iOS and Android app-link association files into `dist` for:

- `DRNJ459F42.com.setumalaysia.mobile`
- `com.setumalaysia.mobile`

## Deployment

The Vercel project for this repository should use:

- Framework: `Vite`
- Install command: `npm ci`
- Build command: `npm run build:jom-settle`
- Output directory: `dist`
- Production domain: `malaysia.knowwhatson.com`

Do not commit `.env`, reviewer OTP values, signing keys, mobile artifacts, or Vercel project metadata.
