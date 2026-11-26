# Editor — Developer Guide

Technical reference for developers working on the OpenCASE visual framework editor.

For a non-technical overview, see the [Editor README](../README.md).

---

## Getting Started

```bash
npm install --include=dev
npm run dev          # http://localhost:5173
```

Or run the full stack (Editor + API + Auth) via Docker from the monorepo root — see the [Development Guide](../../../docs/DEVELOPMENT.md).

## Commands

```bash
npm run dev          # Vite dev server with HMR
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Unit tests (single run)
npm run test:watch   # Unit tests (watch mode)
```

---

## Source Layout

```
src/
├── domain/            # CASE entities — no external dependencies
├── application/       # Use-cases, mappers, ports
├── infrastructure/    # API clients, HTTP, persistence
├── ui/                # React components, state, layout
└── app/               # App shell, providers, routing
```

Dependencies flow inward: `domain ← application ← infrastructure ← ui`

---

## State Management

Editor state uses a **pure reducer** pattern. The reducer and all its helpers have zero React dependencies, which makes them straightforward to test and reason about.

- `state/EditorContext.tsx` — Thin React provider that wires the reducer to hooks. Orchestration only, no business logic.
- `state/editorReducer.ts` — Pure reducer handling all state transitions (selection, item edits, adding items, inline alignment edits, graph loading)
- `state/graphTypes.ts` — Editor graph node/edge types and type guards
- `state/editorFactories.ts` — Factory functions for items, documents, and graphs

---

## Editor Graph Mapping

The CASE domain model (Framework, Item, Association) is the source of truth. The editor graph that the Tree View and save work from is a derived projection, with no layout:

- `state/mapping/toEditorGraph.ts` — Domain → editor graph
- `state/mapping/fromEditorGraph.ts` — editor graph → Domain

---

## Testing

```bash
npm run test
```

The test suite covers the pure modules — reducer, graph mapping, CASE package mappers, and factories. Tests live alongside the code they cover (`*.test.ts`), with shared fixtures in `src/__tests__/fixtures.ts`.

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** (build + dev server)
- **Tailwind CSS v4** + shadcn/ui
- **Vitest** (testing)
- **oidc-client-ts** (authentication)
