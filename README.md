# BiteSpeed Chatbot Flow Builder Assignment for Frontend Role

A simple, extensible chatbot flow builder built with React and React Flow. Includes a nodes panel, settings panel, and flow validation on save.

## Live demo

- **URL**: <https://bitespeed-delta.vercel.app/>

### Requirements

- **Node**: >= 22
- **Package manager**: pnpm

### Quick start

- **Install dependencies**

```bash
pnpm install
```

- **Run dev server (Vite, port 3000)**

```bash
pnpm dev
```

- **Build for production**

```bash
pnpm build
```

- **Preview production build**

```bash
pnpm serve
```

### Tech stack

- **Core**: React 19, TypeScript 5, Vite 6
- **Routing**: TanStack Router 1.x
- **Data fetching**: TanStack Query 5.x
- **Flow builder**: @xyflow/react (React Flow)
- **UI**: Tailwind CSS 4 with @tailwindcss/vite, shadcn components (Radix UI + Tailwind), Lucide icons, Sonner toasts
- **State**: Jotai (where needed)
- **Lint/format**: ESLint

### Project layout

- `src/main.tsx`: app bootstrap with TanStack Router and Query provider
- `src/routes/`: route files; `__root.tsx` renders `Toaster`
- `src/components/ui/`: shadcn-style UI components
- `src/integrations/tanstack-query/`: query provider and devtools
- `src/styles.css`: global styles

### Deployment

- Deployed on Vercel at <https://bitespeed-delta.vercel.app/>

### Environment

- No environment variables required.
