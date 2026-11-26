# Project Context: CASE Framework Editor

> Historical design notes. The React Flow canvas described below was removed in CGE-165; the editor now uses the Tree View only. See [architecture.md](architecture.md) for the current structure.

## What this project is

This project is an **editor for CASE frameworks**, built as an **open-source reference implementation**.

It enables users to:

* Create and edit **CASE Frameworks** (`CFDocument`)
* Define **framework items** (`CFItem`)
* Create **associations** (`CFAssociation`) between items
* Manage frameworks in a **draft → publish** lifecycle

This project intentionally focuses on **core authoring capabilities only** and does **not attempt to compete** with full-featured commercial CASE authoring or management systems.

---

## Target users

* 1EdTech members
* CASE implementers and integrators
* Standards, curriculum, policy, and workforce teams

Users may work in different contexts:

* **K–12**: standards, curriculum alignment
* **Higher Education**: learning outcomes, program competencies
* **Workforce**: skills and competency frameworks

The **underlying CASE data model is identical**, but **terminology adapts** to user context.

---

## Technology Stack

### Frontend

* React
* TypeScript
* Tailwind CSS v4
* shadcn/ui
* **React Flow** (`@xyflow/react`) for framework visualization

### Backend

* CASE-compatible API
* Extended with authoring endpoints (`POST`, `PUT`, `DELETE`)
* Publishing creates explicit framework versions

---

# Architectural Principles

## Domain-Driven Design (DDD)

* CASE concepts are modeled explicitly in the **domain layer**
* UI components **do not own domain logic**
* Domain objects are framework-agnostic (not tied to React Flow)

## Clean Architecture

* **Domain** → **Application** → **Infrastructure** → **UI**
* Dependencies flow inward
* React Flow lives entirely in the **UI layer**

---

# Core Domain Model

## Aggregate: `Framework`

**Aggregate Root**

Represents one CASE framework being edited.

Maps to:

* `CFDocument`
* `CFPackage` (as needed)

Owns:

* Items (`CFItem`)
* Associations (`CFAssociation`)
* Framework metadata
* Draft / published state

```ts
Framework
 ├─ id
 ├─ metadata
 ├─ items: Map<ItemId, Item>
 ├─ associations: Map<AssociationId, Association>
 └─ status: Draft | Published
```

---

## Entity: `Item`

Represents a node in the framework.

Maps to:

* `CFItem`

```ts
Item
 ├─ id
 ├─ statement
 ├─ type
 ├─ metadata
 └─ ordering / hierarchy hints
```

Typical semantic types (UI lens, not CASE schema):

* Standard
* Learning Outcome
* Competency
* Skill

> These are **presentation concerns**, not schema-level CASE types.

---

## Entity: `Association`

Represents a relationship between items.

Maps to:

* `CFAssociation`

```ts
Association
 ├─ id
 ├─ fromItemId
 ├─ toItemId
 ├─ associationType
 └─ metadata
```

Common association types:

* `isChildOf` (hierarchy)
* `isPartOf`
* `isRelatedTo`
* `alignsTo` (future)

---

# Domain Graph Model (Critical Concept)

The **domain model is a graph**, not a tree.

* CASE allows **multiple association types**
* Hierarchy is just one association pattern
* Cross-links must be supported later without re-architecture

```text
Framework
 ├─ Items (nodes)
 └─ Associations (edges)
```

---

# React Flow Mapping (View Model)

React Flow is a **projection** of the domain graph.

## Domain → React Flow

### Node mapping

```ts
Item → ReactFlowNode
```

```ts
{
  id: item.id,
  type: 'caseItemNode',
  data: {
    itemId: item.id,
    title: item.statement,
    itemType: item.type
  },
  position: { x, y } // layout-derived
}
```

### Edge mapping

```ts
Association → ReactFlowEdge
```

```ts
{
  id: association.id,
  source: association.fromItemId,
  target: association.toItemId,
  type: 'caseAssociationEdge',
  data: {
    associationType: association.type
  }
}
```

---

## Important rule

> **React Flow nodes/edges are never the source of truth.**

* The domain graph is authoritative
* React Flow state is derived
* User interactions are translated into **domain commands**

---

# Layout Strategy

* Tree-like hierarchy rendered using layout algorithms (e.g. Dagre / ELK)
* Layout is recalculated on structural changes
* Node dragging is optional and cosmetic
* Layout data may be persisted separately from CASE data

---

# Application Layer Responsibilities

* Command handlers:

  * `addItem`
  * `updateItem`
  * `removeItem`
  * `addAssociation`
  * `publishFramework`
* Validation rules (e.g. no cycles in hierarchy if enforced)
* Draft state management

---

# UI Layer Responsibilities

* Render domain graph using React Flow
* Translate UI actions → application commands
* Display draft/publish status
* Adapt terminology by user context
* Ensure accessibility (WCAG)

---

# Accessibility Considerations

* Canvas interaction must be keyboard accessible
* Nodes must be focusable
* Screen readers must have a logical navigation order
* Optional **outline / ARIA tree view** can mirror the same domain graph

---

# Non-Goals (By Design)

* Multi-user collaboration
* Workflow approvals
* Analytics or reporting
* Vendor-specific extensions

---

## Summary

This project:

* Is a **CASE framework editor**
* Uses **DDD + Clean Architecture**
* Treats CASE as a **graph domain**
* Uses React Flow as a **visual projection**
* Prioritizes clarity, trust, and extensibility
