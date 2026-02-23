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
- `state/editorReducer.ts` — Pure reducer handling all state transitions (selection, CRUD, layout, connect, delete, etc.)
- `state/helpers/nodeGeometry.ts` — Geometry utilities, type guards, graph adjacency builders
- `state/editorFactories.ts` — Factory functions for items, documents, edges, and graph structures

---

## Layout Algorithms

Three auto-layout modes, all pure functions with no side effects:

| Layout | When to use | Edge style |
|--------|------------|-----------|
| **Hierarchy** | Flat lists — many items at one level | smoothstep |
| **Star** | Radial — framework at centre, branches fan out | bezier |
| **Tree** | General purpose — recursive horizontal spread | bezier |

The editor auto-detects which layout suits a framework when no saved positions exist, and applies it *before* the first render (so there's no visible jump).

- `layout/detectTopology.ts` — Classifies the graph shape
- `layout/applyInitialLayout.ts` — Pre-render layout orchestrator

---

## React Flow Mapping

The CASE domain model (Framework, Item, Association) is the source of truth. React Flow is a derived projection:

- `reactflow/mapping/toReactFlow.ts` — Domain → React Flow
- `reactflow/mapping/fromEditorGraph.ts` — React Flow → Domain + layout

---

## Testing

```bash
npm run test
```

The test suite covers all the pure modules — reducer, layout algorithms, geometry helpers, topology detection, and factories. Tests live alongside the code they cover (`*.test.ts`), with shared fixtures in `src/__tests__/fixtures.ts`.

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** (build + dev server)
- **Tailwind CSS v4** + shadcn/ui
- **@xyflow/react** (React Flow)
- **Vitest** (testing)
- **oidc-client-ts** (authentication)
