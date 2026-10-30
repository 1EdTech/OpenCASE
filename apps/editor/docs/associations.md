# Associations: import, display and authoring

How the editor and server handle a framework's associations: what gets imported, where associations are stored, how the Tree View shows and edits them, and what happens on save. The canvas view is disabled and is not covered here.

---

## Terminology

| Term | Meaning |
|---|---|
| **Inline** | The CFAssociation is stored in the framework's own CFPackage. |
| **Alignment framework** | A separate CFDocument with `frameworkType: "Alignment"` that holds associations from one framework into another. It has no items of its own. |
| **Owner** (source) | The framework whose associations an alignment framework holds. An alignment framework always belongs to exactly one owner. |
| **External association** | An association from one of a framework's items to a node in a *different* framework. It can be stored inline or in an alignment framework. |
| **Hosted** / **remote** | Whether the framework an association points into is on this OpenCASE server (hosted) or not (remote). This is about where the destination lives, not where the association is stored. |
| **Self alignment** | An association between two items of the *same* framework that the author drew in the Tree View (not `isChildOf`). |
| **Structure** | The `isChildOf` associations that make up a framework's tree. They are always inline and are never treated as alignments. |

"Inline / alignment framework" describes **where an association is stored**. "Hosted / remote" describes **where its destination lives**. The two are independent: an inline association can point at a hosted or a remote framework.

---

## The data

### A CFAssociation

```json
{
  "identifier": "<association id>",
  "associationType": "isRelatedTo",
  "originNodeURI": {
    "title": "SCI.1 Describe the water cycle.",
    "identifier": "<science item id>",
    "uri": "https://case.example.org/ims/case/v1p1/CFItems/<science item id>"
  },
  "destinationNodeURI": {
    "title": "MATH.4 Read data from a chart.",
    "identifier": "<math item id>",
    "uri": "https://case.example.org/ims/case/v1p1/CFItems/<math item id>"
  }
}
```

- Each end names a node by its **item identifier** (or a CFDocument identifier). Neither end says which framework the node belongs to. Finding that out needs the server's item index (see [Hosted or remote](#hosted-or-remote)).
- Each end's `title` is a display label. Its format is the publisher's choice (for example `humanCodingScheme` + `fullStatement`). The editor keeps the title it was given and only generates one (from the item's statement) for associations authored in the editor.
- A CASE 1.1 end can carry `targetType`. Any value other than `CASE` (e.g. `ext:curriculumGoals`) marks a destination that is not a CASE item at all. Such a destination can never be hosted.

### An alignment framework

```json
{
  "CFDocument": {
    "identifier": "<alignment framework id>",
    "title": "Alignment: Science → Math",
    "frameworkType": "Alignment",
    "extensions": {
      "ext:opencase": {
        "alignmentSource": { "identifier": "<Science CFDocument id>", "uri": "/ims/case/v1p1/CFDocuments/<Science id>" },
        "alignmentParticipants": [
          { "identifier": "<Science CFDocument id>", "uri": "…" },
          { "identifier": "<Math CFDocument id>", "uri": "…" }
        ]
      }
    }
  },
  "CFItems": [],
  "CFAssociations": [ /* the same shape as inline associations */ ]
}
```

- There is one alignment framework per (owner, target framework) pair. They exist so that a framework's associations are split by target instead of piling up in one document.
- `alignmentSource` names the owner. Alignment frameworks saved before it existed always listed the owner first in `alignmentParticipants`, and `alignmentFrameworkSourceId` falls back to that.
- The second participant must be the target **CFDocument identifier**. That is why alignment frameworks can only hold associations to hosted frameworks: for a remote destination we only know the item, not its framework, and we never guess.
- A self alignment's alignment framework names the owner as both participants and is titled `Internal Alignment: <title>`.
- The associations inside are byte-for-byte the same as they would be inline. Moving an association between the two storage locations doesn't change it.

### The storage setting

Each framework has `ext:opencase.alignmentStorage` on its CFDocument:

| Value | Associations to hosted frameworks are stored… |
|---|---|
| `inline` (or absent) | in the framework |
| `alignmentFramework` | in alignment frameworks the framework owns |

- Associations to **remote** frameworks are always stored inline, whatever the setting. This is a deliberate exception to "a framework stores its external associations one way or the other, never both". Without the target framework on this server there is no alignment framework to put them in.
- Structure and self alignments aren't affected by the setting.
- Authors change it in the framework's properties panel, under **Alignments**. Like `publicAccess`, it lives in `ext:opencase`, so the editor threads it through load and save (`normalizeCasePackage` → domain `FrameworkMetadata.alignmentStorage` → `toCasePackage`).

---

## Import

`ImportFramework.ts` (server):

- Keeps every association verbatim: provider `ext:` association types, links to items that aren't on this server, and non-CASE targets.
- Discards any `ext:opencase` that came with the source (OpenCASE's own state is never taken from outside) and writes its own. That includes `alignmentStorage: "inline"`. There is no way to import alignment frameworks, so an imported framework's associations are inline by definition.
- Marks the framework as a mirror (`isModifiedFromSource: false`). See [Mirrors and forks](#mirrors-and-forks).

Import order matters for hosted vs remote. When imported frameworks link to each other, a link only counts as hosted once its target framework has been imported.

---

## Loading into the editor

The editor state (`EditorContext`, `editorReducer`) holds a framework as nodes (items and the document) and edges (associations between them). Only associations with **both ends in the framework** become edges. Associations to anything else, including every external association, have no edge. `withOffCanvasAssociations` carries them over from the framework as loaded when the editor saves, so they aren't lost.

Edges keep their association's stored node titles (`toReactFlow` → `fromEditorGraph`), so a save writes back the titles that were loaded.

---

## Showing associations in the Tree View

The right-hand panel lists **Associated Frameworks**. Each entry is a target the framework has associations into. It's built from two sources.

### Inline external associations

1. `externalAlignmentsOf(framework)` picks the inline associations that start at one of the framework's items and end somewhere outside it. It skips `isChildOf`/`isPartOf` and links to a CFDocument (such as an overview framework's `exactMatchOf` to each subject framework).
2. Their destinations are looked up to find which are hosted (below).
3. `groupExternalAlignments` makes one target per hosted framework (titled from the server) and one per remote host (`goals.example.org (not on this server)`). Remote entries list the destinations themselves, with links to their URIs.

The view also applies the edits made in this session (`applyInlineAlignmentEdits`), so it shows the associations as they'll be saved.

### Hosted or remote

The URI can't tell us: imported associations keep their source's URIs (e.g. `https://case.example.org/…`) even when the target framework has been imported here too. Instead the editor asks the server:

`POST /management/tenants/{tenantId}/ims/case/{v1p0|v1p1}/CFItems/lookup-documents` with `{ identifiers: [...] }` (at most 10,000) returns `{ [itemId]: { identifier, title } }` for each item a non-archived framework on this server holds. It reads only the server's item and document indexes. Anything not returned is remote. Non-CASE targets are never sent. The Tree View caches answers, misses included, so an edit only looks up new destinations.

### Alignment frameworks

On opening, `handleDiscoverAlignedTargets` lists the alignment frameworks that include this framework as a participant and keeps **only the ones it owns**. An alignment framework where this framework is merely the target holds another framework's associations and isn't shown. Each owned one adds its target to the list. Its associations are loaded when the list is built, or when the target is first expanded (`handleLoadAlignmentsForTarget`).

---

## Authoring in the Tree View

The author expands a target and drags an item from the left panel onto an item on the right. The association type defaults to `isRelatedTo`. The badge popover lets the author change the type (Exact Match Of, Is Related To, Is Peer Of, Precedes, Is Replaced By) or remove the association. `isChildOf` can't be authored here, so it never ends up in an alignment framework.

Where the new association goes:

| Target | Setting `inline` | Setting `alignmentFramework` |
|---|---|---|
| Hosted framework | Inline | That target's alignment framework |
| Remote | Inline | Inline |
| This framework (self) | Alignment framework | Alignment framework |

**Inline** associations are kept in `editorReducer` as `InlineAlignmentEdits` (`added`, `removedIds`, `typeChanges`). They mark the framework dirty, are applied to it when it's saved, and are cleared after a successful save. Every edit is idempotent, so applying it to a framework that already has it changes nothing.

**Alignment framework** associations are saved separately, with the target's own **Save** button in the Associated Frameworks list. `buildAlignmentFrameworkPackage` writes the alignment framework, owned by this framework. If the last association is removed, the alignment framework is deleted.

Inline associations to hosted frameworks are read-only while the setting is `alignmentFramework`. That only happens between switching the setting and saving, after which they've moved.

---

## Changing the storage setting

Switching the setting moves the existing associations to hosted frameworks **when the framework is saved**. Nothing moves if the author switches and then discards.

`application/framework/services/AlignmentStorage.ts`:

- `planAlignmentStorage` works out what will move, without changing anything:
  - **To alignment frameworks:** the inline associations whose destinations are hosted, grouped by target framework. They're merged into the alignment framework the owner already has for that target, or a new one.
  - **To inline:** the associations in every alignment framework the framework owns, except self alignments.
- `saveWithAlignmentStorage` saves the framework and carries out the plan.

The server won't let the same association identifier be in two frameworks at once (`FileFrameworkStore`). So an association always leaves where it is before it's written where it goes:

- **Into alignment frameworks:** the framework is saved without the associations, then the alignment frameworks are written. If writing fails, the editor still holds the associations and stays unsaved, so saving again finishes the move.
- **Into the framework:** the alignment frameworks are deleted, then the framework is saved with the associations. If the save fails, the alignment frameworks are recreated from the copies already fetched.

After a move, the editor reloads the framework from the server and the Tree View rediscovers its alignment frameworks (`alignmentsRevision`).

---

## Mirrors and forks

An imported framework is a **mirror** of its source until its data is edited. The first save that changes its data **forks** it into an independent copy: the server (`mirrorFork.ts`) generates new identifiers for its document, items and associations. The editor warns first ("Fork this mirrored framework?").

What counts as a data change: both the server (`stripNonDataFields`) and the editor (`hasFrameworkDataChanged`) ignore `ext:opencase` (including `publicAccess` and `alignmentStorage`), `lastChangeDateTime`, GET-only back-references, `CFDefinitions`, and the titles on association ends. Which nodes an association connects, and its type, are compared.

Associations interact with forking in four ways:

- **Changing the storage setting** is not a data change by itself, but moving associations is. When the setting changed on an unforked mirror, the editor runs `planAlignmentStorage` before deciding whether to warn. The warning only appears if something will move, and it says what: "19 associations to frameworks on this server will move from this framework into alignment frameworks." The same plan is then used for the save.
- **Associations to other frameworks are left alone.** The fork only gives new identifiers to nodes in the framework being forked. An end that refers to a node anywhere else keeps its identifier and URI.
- **Alignment frameworks follow the fork.** The save response includes `forkedIdentifiers` (old → new, for the document and every item). Afterwards the editor rewrites each alignment framework the framework owns to the new identifiers (`remapAlignmentFramework`), and writes any moved associations with them directly.
- **Links from other frameworks break.** Another framework's associations into the forked one still name its old item identifiers, so they now show as remote. This is not handled yet.

---

## Known gaps

- Forking breaks other frameworks' associations into the forked framework (see above).
- If a save forks the framework and writing an alignment framework then fails, saving again from the same session will go wrong, because the editor still holds the pre-fork identifiers.
- The public `CFItemAssociations` endpoint doesn't return incoming inline associations from other frameworks.
- Remote destinations are grouped by URI host. A host can serve many frameworks, so one entry may cover several.

---

## Where the code is

| Concern | Location |
|---|---|
| Import (inline setting, `ext:opencase`) | `apps/opencase/src/application/case/endpoints/ImportFramework.ts` |
| Hosted lookup endpoint | `apps/opencase/src/application/case/endpoints/LookupItemDocuments.ts`, `CFItemsManagementController.lookupDocuments` |
| Fork identifiers and data-change detection (server) | `apps/opencase/src/application/case/services/mirrorFork.ts`, `CreateFramework.ts` |
| Inline external associations, hosted/remote grouping | `src/domain/framework/externalAlignments.ts` |
| Alignment framework shape, ownership, merge, fork remap | `src/domain/framework/alignmentFrameworks.ts` |
| Inline edits made in the Tree View | `src/domain/framework/inlineAlignmentEdits.ts`, `editorReducer` (`inlineAlignment/*`) |
| Moving associations on save | `src/application/framework/services/AlignmentStorage.ts` |
| Saving, plan before fork warning | `src/ui/editor/EditorCanvas.tsx` (`handleSave`, `doSave`), `src/app/App.tsx` (`handleSaveToServer`) |
| Data-change detection (editor) | `src/domain/framework/hasFrameworkDataChanged.ts` |
| Associations without an edge | `src/domain/framework/offCanvasAssociations.ts` |
| Association export, node titles | `src/application/framework/mappers/case/toCasePackage.ts` |
| Tree View | `src/ui/editor/treePanel/TreePanelView.tsx` |
| Storage setting UI | `src/ui/editor/components/NodePropertiesPanel.tsx` (Alignments section) |
