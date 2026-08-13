# Publish to Registry — Local Testing Guide

How to exercise the OpenCASE ↔ Credential Registry flows via the Registry Assistant:

- **Dry-run** (`/format`) — maps a stored CASE framework to a Registry Assistant
  request and validates it. **Nothing is published** and no CTIDs are persisted. Use
  this to prove the mapping and surface validation errors before writing.
- **Publish** (`/publish`) — actually writes the framework to the registry. OpenCASE
  mints (or reuses) a `ce-<uuid>` CTID for the framework and every competency, records
  the returned **registry envelope id per environment**, and saves them back onto the
  package. Because that identity is persisted, **re-publishing updates the same
  registry resource instead of creating a duplicate.**
- **Status** — the library and editor show whether a framework is published, to which
  environments, and whether it has **changed since publishing**. See
  [Publish status in the UI](#publish-status-in-the-ui).
- **Remove** (`/unpublish`) — **delete** the registry resource (clears the local publish
  link) or **deprecate** it. See
  [Remove from the registry](#remove-from-the-registry-delete-or-deprecate).

## Prerequisites
- A **sandbox** Registry Assistant API key and your **publishing organization's CTID**
  (`ce-…`), from your Credential Engine sandbox account. See
  https://credreg.net/registry/assistant.
- The `feat/publish-to-registry` branch checked out.

## 1. Configure credentials
Add to your root `.env` (the API key is a secret — never commit it):
```
REGISTRY_ASSISTANT_ENVIRONMENT=sandbox
REGISTRY_ASSISTANT_API_KEY=<your sandbox api key>
REGISTRY_ASSISTANT_ORG_CTID=ce-<your org ctid>
```

## 2. Rebuild the backend
The container runs the compiled `dist`, so the new code needs a build:
```bash
docker-compose up --build opencase
```

---

## Dry-run (validate, nothing written)

### Option A — from the editor (easiest)
1. Sign in and open a **saved** framework (one that's been published to OpenCASE)
   that you **authored or forked**. Imported-but-unforked frameworks are read-only
   and intentionally not publishable.
2. Click the **framework node** to open the side panel, then **Export** →
   **Publish to registry…**.
3. In the dialog, choose **sandbox** (default) or production, then **Run dry-run**.
   You'll see whether the Registry Assistant accepted the mapping, any validation
   **Messages**, and the exact request under "Request sent to Registry Assistant".

The button uses your existing editor session — no manual token needed — and appears
only for saved, editable frameworks.

### Option B — via the API (scripting)
`/management` requires a bearer token, and password grants are disabled, so grab the
token the editor is already using: sign in, open DevTools → **Network** → copy the
`Authorization: Bearer <token>` from any `/management` or `/ims` request (tokens are
short-lived). The framework **docId** is its `CFDocument.identifier`; the default
tenant is `system`.

```bash
curl -X POST \
  "http://localhost:3000/management/tenants/system/ims/case/v1p1/CFPackages/<docId>/preview-publish" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Add `?environment=production` (or `-d '{"environment":"production"}'`) to dry-run
against production instead of sandbox.

#### What the dry-run returns
A `200` with:
- **`request`** — the exact Registry Assistant payload OpenCASE would send:
  `CompetencyFramework` with a freshly minted `CTID`, `Name`, `Publisher` (your org
  CTID) and `HasTopChild`; `Competencies[]` with `CTID`, `CompetencyText`,
  `IsPartOf` / `IsTopChildOf` / `IsChildOf`, and any `ExactAlignment` / `AlignTo` from
  your alignment associations.
- **`format`** — the Registry Assistant response: `format.ok` is `true` when the
  mapping validates; `format.body.Messages` lists any problems (e.g. a missing
  `Description` or `Publisher`, which the Registry Assistant requires).

---

## Publish (writes to the registry)

> Sandbox is safe to publish to freely. **Production writes to the live registry** —
> only publish there when you mean it.

Publish operates on the **last saved version** of the framework (same as the dry-run),
so save any pending edits first.

### Option A — from the editor (recommended)
1. Open the same dialog (**Export → Publish to registry…**) and pick the environment.
2. **Run dry-run** first. The **Publish to \<environment\>** button appears only after a
   dry-run *passes for the currently selected environment* — changing the environment
   clears the result, so you always publish exactly what you validated.
3. For **production**, tick the *"I understand this publishes to the live production
   registry"* checkbox to enable the button.
4. Click **Publish**. On success the dialog shows a result panel with:
   - whether it was a **create** or an **update**,
   - the **resource URL** on the registry (click through to view it), and
   - the minted **CTID** and **registry envelope id**.

**Verify the round-trip:** publish once (result says *Published*), then click **Run
dry-run** again and **Publish** again — the second result should say **Updated** and
point at the *same* resource URL. That confirms the persisted CTID + envelope are being
reused rather than minting a duplicate.

### Option B — via the API (scripting)
Same token/docId/tenant as the dry-run above.

```bash
curl -X POST \
  "http://localhost:3000/management/tenants/system/ims/case/v1p1/CFPackages/<docId>/publish" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
Add `?environment=production` (or `-d '{"environment":"production"}'`) to publish to
production instead of sandbox.

#### What publish returns
A `200` with:
- **`ctid`** — the framework's CTID (minted on first publish, reused thereafter).
- **`resourceUrl`** — where the framework lives on the registry, e.g.
  `https://sandbox.credentialengineregistry.org/resources/ce-<uuid>`.
- **`registryEnvelopeId`** — the envelope the Registry Assistant returned.
- **`isUpdate`** — `false` on the first publish, `true` on subsequent ones for the
  same environment.
- **`environment`** and **`messages`** — the target and any Registry Assistant notes.

On failure the backend returns `400 { "error": "publish_failed", "message": … }` with
the Registry Assistant's reason.

#### Where the persisted identity lives
After a successful publish OpenCASE saves a **new version** of the package with, under
the CFDocument and each CFItem's `ext:opencase` extension:
```jsonc
"published": {
  "ctid": "ce-<uuid>",
  "contentHash": "<sha256 of the content at publish time>",
  "byEnvironment": {
    "sandbox":    { "registryEnvelopeId": "…", "publishedAt": "…", "status": "Deprecated?" },
    "production": { "registryEnvelopeId": "…", "publishedAt": "…" }
  }
}
```
`ctid` is shared across environments; the envelope id is tracked **per environment**, so
the same framework can be published independently to sandbox and production. Because the
publish endpoint always reads the stored package, a re-publish reuses this identity even
if the editor tab is stale. The editor also doesn't round-trip this block, so on every
save the backend carries it forward from the prior version (matching items by identifier)
— an edit between publishes can't wipe the CTIDs, and a re-publish updates rather than
duplicates.

---

## Publish status in the UI

Once published, status shows up in two places, driven by the framework list metadata
(`publish` summary: `ctid`, per-environment `resourceUrl` + `status`, and `needsUpdate`):

- **Library cards (home):** a badge —
  - **In Registry** (green) — published and unchanged since.
  - **Registry: changed** (amber) — edited since the last publish; re-publish to update.
  - **Registry: deprecated** (grey) — every published environment is deprecated.
- **Framework side panel (editor):** a status block listing each environment with a
  clickable resource link and, when changed, a "re-publish to update" hint. The publish
  button label becomes **Manage registry publication…** once published.

**How "changed since publish" is detected:** each save stores a content fingerprint
(`ext:opencase.contentHash`) over the framework's publishable content — statements,
structure, alignments — but **excluding** volatile fields (timestamps) and publish
bookkeeping. Publishing snapshots that hash into `published.contentHash`. When the two
differ, the framework is flagged changed. (A framework published *before* this feature
has no snapshot to compare against, so it won't flag as changed until re-published once.)

To test: publish a framework → card shows **In Registry** → add a statement and **save**
→ card flips to **Registry: changed** → re-publish → back to **In Registry**, same
resource URL.

---

## Remove from the registry (delete or deprecate)

CE notes registry data is "meant to be permanent" and recommends **deprecating** over
hard-deleting. OpenCASE offers both; delete is best for sandbox cleanup.

- **Deprecate** — re-publishes the same resource with `PublicationStatusType: Deprecated`
  (keeps the CTID + envelope link; the card badge shows *deprecated*).
- **Delete** — hard-deletes the resource via the Registry Assistant delete endpoint and
  **clears the local publish link**: the environment's record is removed, and when no
  environments remain the whole `published` block (including the CTID) is dropped so a
  later publish mints fresh CTIDs. Your local OpenCASE framework is kept either way.

### Option A — from the editor (recommended)
1. Open **Export → Manage registry publication…** and select the environment.
2. In the **Currently in the registry** section, click **Deprecate** or **Delete…**
   (Delete is behind an inline confirm; production is also behind the publish confirm).
3. On success the dialog reports the outcome; the library badge and side-panel status
   update on the next render.

### Option B — via the API (scripting)
Same token/docId/tenant as publish. `mode` is `delete` or `deprecate`.

```bash
curl -X POST \
  "http://localhost:3000/management/tenants/system/ims/case/v1p1/CFPackages/<docId>/unpublish" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"delete","environment":"sandbox"}'
```

#### What unpublish returns
A `200` with `mode`, `environment`, `ctid`, `messages`, and (for delete)
`publishLinkCleared` — `true` when the last environment was removed and the framework is
now fully unpublished locally. On failure: `400 { "error": "unpublish_failed", "message": … }`.

---

## Common responses
- **503 / 400 "Publishing not configured"** — `REGISTRY_ASSISTANT_API_KEY` or
  `REGISTRY_ASSISTANT_ORG_CTID` is unset; recheck `.env` and that you rebuilt.
- **401** (Option B) — missing/expired bearer token; grab a fresh one.
- **`format.ok: false`** (dry-run) — the mapping reached the Registry Assistant but it
  rejected the content; read `format.body.Messages` for the specifics.
- **`400 publish_failed`** (publish) — the write was rejected; the `message` carries the
  Registry Assistant's reason. Run a dry-run to see the detailed `Messages`.
- **`400 unpublish_failed`** — delete/deprecate was rejected. A common case is
  *"Framework is not published to \<env\>"* when there's no publish link for that
  environment; the `message` otherwise carries the Registry Assistant's reason.
