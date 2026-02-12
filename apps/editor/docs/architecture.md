# Architecture & Project Guide

## What this project is

An **open-source editor for 1EdTech CASE frameworks**. You can create and edit frameworks (CFDocument), items (CFItem), and associations (CFAssociation) through a visual canvas, with a **draft → publish** workflow. It's deliberately focused on core authoring — not trying to replace commercial CASE tools.

Under the hood, the CASE model is treated as a **graph** (items + associations). The canvas you see in the UI is just one way to visualise that graph — the domain model is what matters.

## Tech stack

* React 19 + TypeScript (Vite)
* Tailwind CSS v4
* shadcn/ui components
* React Flow (`@xyflow/react`)
* Vitest (unit testing)
* oidc-client-ts (authentication)

---

## Architectural goals (non-negotiables)

These are the principles we don't bend on:

1. **Domain model is the source of truth** — The domain representation of a framework (items + associations) is authoritative.

2. **React Flow is a projection of the domain graph** — React Flow nodes/edges are derived from the domain model. They're not the canonical data.

3. **All user interactions become application commands** — UI events (edit node, add child, connect, delete) must translate to commands handled by the application layer.

4. **Clean architecture dependency direction** — Dependencies always point inward:
   * `domain` has no dependencies on React, React Flow, APIs, or storage
   * `application` depends on `domain`
   * `infrastructure` implements interfaces defined by `application`
   * `ui` depends on `application` (and uses `infrastructure` through composition)

---

## Folder structure

Pure logic (reducer, layout algorithms, geometry) is isolated from React so it can be tested and reasoned about independently.

```
src
├── app
│   ├── App.tsx                     # App shell — topology detection + pre-render layout
│   ├── main.tsx
│   └── providers/

├── domain
│   └── framework/
│       └── model/                  # Framework, Item, Association entities

├── application
│   └── framework/
│       ├── mappers/                # Domain ↔ CASE JSON DTO mapping
│       └── ports/                  # Repository / ID generator interfaces

├── infrastructure
│   └── caseApi/
│       ├── CaseApiClient.ts        # HTTP client for CASE API
│       └── http.ts                 # Fetch-based HTTP client

├── ui
│   ├── editor
│   │   ├── components/             # Canvas, header, dialogs
│   │   ├── reactflow/
│   │   │   ├── nodeTypes/          # CaseItemNode, CaseFrameworkNode
│   │   │   ├── edgeTypes/          # LabeledEdge
│   │   │   ├── mapping/
│   │   │   │   ├── toReactFlow.ts  # Domain → React Flow nodes/edges
│   │   │   │   └── fromEditorGraph.ts  # React Flow → Domain + layout
│   │   │   └── types.ts           # CaseEditorNodeType, CaseEditorEdge, CaseEdgeData
│   │   ├── state/
│   │   │   ├── EditorContext.tsx   # React provider (orchestration only)
│   │   │   ├── editorReducer.ts   # Pure state reducer (no React dependency)
│   │   │   ├── editorFactories.ts # Node/edge factory helpers
│   │   │   └── helpers/
│   │   │       └── nodeGeometry.ts # Pure geometry, type guards, adjacency
│   │   ├── layout/
│   │   │   ├── detectTopology.ts       # Classify graph as hierarchy/star/tree
│   │   │   ├── applyInitialLayout.ts   # Pre-render layout orchestrator
│   │   │   ├── hierarchyLayout.ts      # Flat column layout (smoothstep)
│   │   │   ├── starLayout.ts           # Elliptical radial layout (bezier)
│   │   │   └── treeLayout.ts           # Recursive tree-spread layout (bezier)
│   │   └── terminology/
│   │       ├── lens.ts
│   │       └── strings.ts
│   ├── home/                       # Home screen, framework cards, import dialog
│   └── shared/
│       ├── components/ui/          # shadcn/ui primitives
│       └── hooks/

├── __tests__
│   └── fixtures.ts                 # Reusable mock factories for tests

├── styles/
│   └── index.css

└── lib/
    └── utils.ts
```

---

## Domain model

We treat CASE as a **graph**:

* `Item` = node (`CFItem`)
* `Association` = edge (`CFAssociation`)
* `Framework` = aggregate root owning items + associations (`CFDocument` + supporting structures)

The domain model has no knowledge of React Flow, the UI, or any external system.

---

## Domain ↔ React Flow mapping

This is the most important boundary in the codebase. The mapping code is intentionally centralised in two files:

* `src/ui/editor/reactflow/mapping/toReactFlow.ts` — Domain → React Flow
* `src/ui/editor/reactflow/mapping/fromEditorGraph.ts` — React Flow → Domain

**How it works:**

1. **Domain → React Flow is derived** — React Flow nodes/edges are built from the domain `Framework` (Item → Node, Association → Edge).
2. **UI changes become commands** — When a user drags, edits, or connects something, the UI translates that into an application command. The command updates the domain model, and the UI re-renders by re-projecting the domain.
3. **Layout is separate** — Positions (x, y) are a UI concern. They're stored in UI state, not in domain entities.

---

## State management

Editor state uses a **pure reducer** pattern, cleanly separated from React:

### Pure modules (no React dependency)

* **`state/editorReducer.ts`** — A single pure function that handles all state transitions: selection, CRUD, layout, connections, graph loading, etc.
* **`state/helpers/nodeGeometry.ts`** — Geometry utilities (sizing, handles, overlap detection), type guards, and graph adjacency builders.
* **`state/editorFactories.ts`** — Factory functions for items, documents, edges, and graph structures.

### Layout algorithms (also pure)

* **`layout/detectTopology.ts`** — Looks at a graph's shape and classifies it as `hierarchy`, `star`, or `tree`.
* **`layout/hierarchyLayout.ts`** — Vertical column: framework at top, items stacked below. Smoothstep edges.
* **`layout/starLayout.ts`** — Radial: framework at centre, branches fan out in angular sectors. Bezier edges.
* **`layout/treeLayout.ts`** — Recursive horizontal tree-spread. Bezier edges.
* **`layout/applyInitialLayout.ts`** — Pre-render orchestrator. Detects topology and applies layout *before* the first React Flow render, so there's no visible jump.

### React orchestration

* **`state/EditorContext.tsx`** — A thin React provider. It imports the reducer and layout functions, wires them up with hooks, and exposes the `EditorContext` API. Business logic stays out.

---

## Application layer

Commands define what a user can do:

* `AddItem`, `UpdateItem`, `RemoveItem`
* `AddAssociation`, `RemoveAssociation`
* `PublishFramework`

Command handlers validate inputs, enforce domain invariants, update the model, and call repository ports as needed.

---

## Infrastructure

Implements the interfaces defined in `application/ports`:

* `FrameworkRepository` — load/save/publish
* `IdGenerator` — GUID/URI generation
* HTTP client for the CASE API
* Serialisation between domain objects and CASE JSON DTOs

---

## UI layer

* Renders the canvas editor (React Flow)
* Provides panels and dialogs for editing properties
* Translates UI events → commands
* Shows draft status and the explicit publishing flow
* Applies a **terminology lens** (K-12 / HE / Workforce) — UI labels adapt to context without touching the domain

---

## Draft → Publish workflow

* All edits happen in a **draft state**
* Switching frameworks discards the draft (with a warning)
* Publishing is explicit: review changes, optionally add notes, then publish

---

## Testing

All pure modules have unit tests (Vitest, jsdom). Tests live alongside the code they cover (`*.test.ts`), with shared fixtures in `src/__tests__/fixtures.ts`.

```bash
npm run test         # Single run
npm run test:watch   # Watch mode
```

If you're adding a new reducer action or layout algorithm, please add tests to go with it.

---

## Contributing

Where to put things:

* **Business meaning** → `domain/`
* **Use-case or command** → `application/`
* **Presentation** → `ui/`
* **External integrations** → `infrastructure/`

If you're working on **nodes/edges**:
* Change components in `ui/editor/reactflow/*`
* Keep mapping logic in `mapping/*`

If you're adding **state logic**:
* Add new actions to the `Action` union in `editorReducer.ts`
* Handle them in the reducer (keep it pure)
* Keep `EditorContext.tsx` as a thin orchestrator
* Write tests

---

## Why the mapping matters

CASE frameworks are inherently items + associations — a graph. Even though the current UI mostly shows a tree, future features (crosswalks, alignment links, references) will need edges that aren't purely hierarchical. Getting the mapping right now avoids a painful re-architecture later.
