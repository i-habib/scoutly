# Scoutly

Scoutly is a TanStack Start + React app for planning and tracking progress toward Eagle Scout, with an SSR Node server for production-style preview.

## Runtime And Package Manager

- Node: 22+
- Package manager: pnpm

This repo uses pnpm as the single lockfile source of truth.

## Install

```bash
pnpm install
```

If `pnpm` is not available in your shell:

```bash
corepack enable
corepack pnpm install
```

## Run Locally

### Development mode (Vite)

```bash
pnpm dev
```

Runs the app at http://localhost:3000 with hot reload.

### SSR preview mode (Node server)

```bash
pnpm build
pnpm preview
```

`preview` runs `node server.js` and serves:
- SSR HTML from `dist/server`
- static client assets from `dist/client`

The canonical Merit Badges list path is `/merit-badges/`.

## Build

```bash
pnpm build
```

## Test

Run the unit/integration test suite:

```bash
pnpm test
```

Run SSR smoke coverage (build + live server checks):

```bash
pnpm test:smoke
```

Smoke checks validate:
- `GET /` returns HTML
- at least one compiled `/assets/...` file is reachable

## Key Scripts

- `pnpm dev`: Vite dev server
- `pnpm build`: production build
- `pnpm start`: SSR Node server (`server.js`)
- `pnpm preview`: alias to `pnpm start`
- `pnpm serve`: alias to `pnpm preview`
- `pnpm test`: Vitest
- `pnpm test:smoke`: build + SSR smoke tests
