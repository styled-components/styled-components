# styled-components Sandbox

Next.js 16 + React 19 testing environment for styled-components.

## Features

- **React 19**: Latest React with full RSC support
- **Next.js 16**: Turbopack-powered development with RSC support
- **styled-components v6**: Full theme support with TypeScript inference
- **RSC Best Practices**: Proper Server/Client Component architecture

## Getting Started

```bash
pnpm install
pnpm dev
```

Visit http://localhost:3000

## Routes

- `/` - Home page with feature showcase
- `/client-example` - Advanced client-side testing harness

## Architecture

### RSC Pattern

Following Next.js App Router best practices:

```
app/
├── layout.tsx              # Root layout (Server Component)
├── page.tsx               # Home page (Server Component wrapper)
├── components/
│   ├── theme-provider.tsx  # Client Component - Theme context
│   ├── home-content.tsx    # Client Component - Themed content
│   └── interactive-demo.tsx # Client Component - Interactive UI
└── lib/
    └── test-themes.ts      # Theme definitions
```

### Key Principles

1. **Registry for SSR**: The style registry extracts client-component styles during server rendering, ensuring they work without JavaScript
2. **Theme at Client Boundary**: `ThemeProvider` is a Client Component
3. **Themed Components**: Components using `theme` props must be Client Components
4. **Server Components**: Use for static content without theming

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Notes

- **Registry is required** for client components: extracts their styles during SSR using `useServerInsertedHTML`
- Server components don't need the registry
- Styles are sent inline with HTML, ensuring they work without JavaScript
- Theme switching is client-side only (dynamic)
- Type definitions are automatically generated from styled-components build
