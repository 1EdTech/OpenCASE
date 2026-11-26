# Architecture & Project Guide

## What this project is

An **open-source editor for 1EdTech CASE frameworks**. You can create and edit frameworks (CFDocument), items (CFItem), and associations (CFAssociation) in a Tree View, with a **draft → publish** workflow. It's deliberately focused on core authoring — not trying to replace commercial CASE tools.

Under the hood, the CASE model is treated as a **graph** (items + associations). The Tree View is one way to show that graph — the domain model is what matters. (An earlier canvas view, built on React Flow, was removed in CGE-165.)

## Tech stack

* React 19 + TypeScript (Vite)
* Tailwind CSS v4
* shadcn/ui components
* Vitest (unit testing)
* oidc-client-ts (authentication)

---

## Architectural goals (non-negotiables)

These are the principles we don't bend on:

1. **Domain model is the source of truth** — The domain representation of a framework (items + associations) is authoritative.

2. **The editor graph is a projection of the domain model** — the editor's nodes/edges are derived from the domain model. They're not the canonical data.

3. **All user interactions become application commands** — UI events (edit node, add child, connect, delete) must translate to commands handled by the application layer.

4. **Clean architecture dependency direction** — Dependencies always point inward:
   * `domain` has no dependencies on React, APIs, or storage
   * `application` depends on `domain`
   * `infrastructure` implements interfaces defined by `application`
   * `ui` depends on `application` (and uses `infrastructure` through composition)

---

## Folder structure

Pure logic (reducer, graph mapping) is isolated from React so it can be tested and reasoned about independently.

```
src
├── app
│   ├── App.tsx                     # App shell — loading, saving, CASE Global targets
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
│   │   ├── FrameworkEditor.tsx     # Header, Tree View, properties panel, save
│   │   ├── components/             # Header, properties panel, dialogs
│   │   ├── treePanel/              # Tree View and crosswalk (associated frameworks)
│   │   ├── state/
│   │   │   ├── EditorContext.tsx   # React provider (orchestration only)
│   │   │   ├── editorReducer.ts   # Pure state reducer (no React dependency)
│   │   │   ├── editorFactories.ts # Graph factory helpers
│   │   │   ├── graphTypes.ts      # CaseEditorNodeType, CaseEditorEdge, CaseEdgeData
│   │   │   └── mapping/
│   │   │       ├── toEditorGraph.ts    # Domain → editor graph
│   │   │       └── fromEditorGraph.ts  # Editor graph → Domain
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

The domain model has no knowledge of the UI or any external system.

---

## Domain ↔ editor graph mapping

This is the most important boundary in the codebase. The mapping code is intentionally centralised in two files:

* `src/ui/editor/state/mapping/toEditorGraph.ts` — Domain → editor graph
* `src/ui/editor/state/mapping/fromEditorGraph.ts` — editor graph → Domain

**How it works:**

1. **Domain → graph is derived** — the editor's nodes/edges are built from the domain `Framework` (Item → Node, Association → Edge).
2. **UI changes become commands** — When a user edits or adds something, the UI dispatches a reducer action; saving rebuilds the domain `Framework` from the graph.
3. **No layout** — nodes carry no positions. Saves no longer write the canvas-era `ext:opencase` layout, edge style, or remote-link data, and drop it where a loaded framework had it.

---

## State management

Editor state uses a **pure reducer** pattern, cleanly separated from React:

### Pure modules (no React dependency)

* **`state/editorReducer.ts`** — A single pure function that handles all state transitions: selection, item edits, adding items, inline alignment edits, graph loading.
* **`state/editorFactories.ts`** — Factory functions for items, documents, and graphs.

### React orchestration

* **`state/EditorContext.tsx`** — A thin React provider. It wires the reducer up with hooks and exposes the `EditorContext` API. Business logic stays out.

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

* Renders the framework in the Tree View
* Provides panels and dialogs for editing properties
* Translates UI events → commands
* Shows draft status and the explicit publishing flow
* Applies a **terminology lens** (K-12 / HE / Workforce) — UI labels adapt to context without touching the domain

---

## Framework versioning (`CFDocument.version`)

The `version` field on a framework's metadata (`CFDocument.version`, e.g. `"1.0"`, `"2024.1"`) is **author-controlled free text** — the editor never generates or mutates it.

**Before:** `frameworkToCfPackage` auto-incremented a `major.minor.build` version on every save (`incrementVersion: true`), and defaulted unset versions to `1.0.0`. The `incrementVersion` flag threaded through `frameworkToCfDocument`, `frameworkToCfPackage`, and `FrameworkExportParams`, and the version field in `NodePropertiesPanel` was a read-only display (hidden entirely when unset).

**Now:** `version` is a straight passthrough of `framework.metadata.version` — unset stays unset, and nothing increments it across saves. `NodePropertiesPanel` exposes it as a free-text input, same pattern as `title`/`creator`/`publisher`.

**Why:** auto-incrementing build numbers on every save was arbitrary versioning the author never asked for and couldn't override — it didn't track anything meaningful (e.g. semantic changes, publish milestones), and a hidden default (`1.0.0`) masked the fact that no version had actually been assigned. Making it a plain authored field puts version semantics under the framework author's control, consistent with other metadata fields like title and publisher.

Note this is distinct from the *storage* versioning the backend does on every save (`{docId}_v0001.json`, `_v0002.json`, ...) — see `apps/opencase/docs/DEVELOPER.md`. That's an internal, immutable revision history; `CFDocument.version` is the framework's own public-facing version label.

See `apps/editor/src/application/framework/mappers/case/toCasePackage.ts` and its test file for the passthrough behavior.

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

If you're adding a new reducer action, please add tests to go with it.

---

## Contributing

Where to put things:

* **Business meaning** → `domain/`
* **Use-case or command** → `application/`
* **Presentation** → `ui/`
* **External integrations** → `infrastructure/`

If you're working on **nodes/edges**:
* Change the graph types in `ui/editor/state/graphTypes.ts`
* Keep mapping logic in `ui/editor/state/mapping/*`

If you're adding **state logic**:
* Add new actions to the `Action` union in `editorReducer.ts`
* Handle them in the reducer (keep it pure)
* Keep `EditorContext.tsx` as a thin orchestrator
* Write tests

---

## Why the mapping matters

CASE frameworks are inherently items + associations — a graph. Even though the current UI mostly shows a tree, future features (crosswalks, alignment links, references) will need edges that aren't purely hierarchical. Getting the mapping right now avoids a painful re-architecture later.
