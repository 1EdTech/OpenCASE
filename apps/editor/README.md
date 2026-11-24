# OpenCASE — Visual Framework Editor

The Editor is the authoring interface for OpenCASE. It provides a tree view where users build [1EdTech CASE](https://www.1edtech.org/activity/case) competency frameworks visually — organising learning objectives, connecting related standards, and publishing the result directly to the OpenCASE publishing server.

---

## What it does

- **Tree editing** — a framework's items appear as a tree; users add and edit items and see the hierarchy at a glance
- **Crosswalks** — users align items to items in other frameworks on the server, or in CASE Global frameworks, by dragging one onto the other
- **Publish to the API** — edited frameworks can be saved directly to the OpenCASE publishing server, making them immediately available to consuming systems
- **Multi-tenant aware** — users sign in through the platform's identity service and work within their organisation's workspace

## How it works

A competency framework is a structured collection of items (individual learning objectives or standards) and associations (the relationships between them). The Tree View shows the items as a hierarchy, with a second panel of associated frameworks to align them to. Users can add and edit items and create, change, and remove associations to other frameworks.

Changes are saved as new immutable versions on the server, preserving a full history of every revision.

---

## Further reading

| Guide | Description |
|-------|-------------|
| [Developer Guide](docs/DEVELOPER.md) | Technical setup, commands, source layout, and internals |
| [Architecture](docs/architecture.md) | Design decisions, folder structure, and contributing guide |
| [Design Context](docs/design.md) | Project context, domain model, and architectural principles |
