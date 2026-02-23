# OpenCASE — Visual Framework Editor

The Editor is the authoring interface for OpenCASE. It provides an interactive canvas where users build [1EdTech CASE](https://www.1edtech.org/activity/case) competency frameworks visually — organising learning objectives, connecting related standards, and publishing the result directly to the OpenCASE publishing server.

---

## What it does

- **Visual canvas editing** — competencies appear as items on a canvas; users drag, reposition, and connect them to define relationships such as "is child of", "is related to", or "precedes"
- **Automatic layout** — when a framework is opened for the first time, the editor analyses its structure and applies an appropriate layout automatically, so items are arranged clearly from the start
- **Publish to the API** — frameworks edited on the canvas can be saved directly to the OpenCASE publishing server, making them immediately available to consuming systems
- **Multi-tenant aware** — users sign in through the platform's identity service and work within their organisation's workspace

## How it works

A competency framework is a structured collection of items (individual learning objectives or standards) and associations (the relationships between them). On the canvas, items appear as nodes and associations appear as connections between them. Users can add, edit, reorder, and delete items; create associations between them; and rearrange the layout to suit the framework's structure.

The editor detects whether a framework is best displayed as a hierarchy, a radial layout, or a tree, and applies the most suitable arrangement before anything appears on screen.

Changes are saved as new immutable versions on the server, preserving a full history of every revision.

---

## Further reading

| Guide | Description |
|-------|-------------|
| [Developer Guide](docs/DEVELOPER.md) | Technical setup, commands, source layout, and internals |
| [Architecture](docs/architecture.md) | Design decisions, folder structure, and contributing guide |
| [Design Context](docs/design.md) | Project context, domain model, and architectural principles |
