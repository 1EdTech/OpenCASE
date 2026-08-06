# CTDL-ASN Import & Alignment — Testing Guide

Steps to exercise importing a CTDL-ASN competency framework from a Credential
Engine registry, aligning CASE items to imported (and external) competencies,
and the read-only / fork workflow. Each step lists what you should see (✅).

## Setup
1. Check out the branch and rebuild (backend changes need a fresh image):
   ```bash
   docker-compose up --build
   ```
2. Optional: point at a non-prod registry with `CREDENTIAL_REGISTRY_BASE_URL`
   (default is `https://credentialengineregistry.org`). A full resource URL
   pasted at import time overrides this per request.
3. Sign in and create (or open) a CASE framework.

## 1. Import a CTDL-ASN framework by CTID
- Home screen → **Import from registry** → paste a CTID or resource URL, e.g.
  `ce-60f05674-961c-4482-8e6e-323e6a538994` (Pathsmith Durable Skills Framework).
- ✅ The framework loads with competency statements on the canvas and in the
  side panel.
- ✅ It opens **read-only**: the header shows a **Read-only** chip + **Enable
  editing**; field edits and add/remove are blocked, but you can still move
  nodes (layout).
- ✅ Selecting a competency → **Technical details** shows **Registry CTID**,
  **Registry CTDL URI**, and **Source registry**.

## 2. Align a local item to a registry competency
- In your own (editable) CASE framework, import a registry competency as a
  reference node, then draw an edge from one of your `CFItem`s to it.
- Repeat with an **external framework** reference node (Add → external
  framework) to exercise the non-registry path.

## 3. Export and verify (View CFPackage JSON)
- **Document provenance:** `CFDocument.extensions["ext:opencase"].source`
  = `{ uri, ctid, registry, format:"ctdl-asn" }`, plus `sourcePackageURI`.
- **Registry alignment association:** `destinationNodeURI.uri` = the registry
  resource URL, `identifier` = the CTID's UUID (not a hash), and
  `ext:opencase.ctdlDestinationUri` is set.
- **External alignment association:** `destinationNodeURI.uri` = the external
  framework URI, with `ext:opencase.externalDestinationUri`.
- **Top-level membership:** a root item's `isChildOf` points to
  `…/CFDocuments/<docId>` (not `…/CFItems/<docId>`).

## 4. Fork (Enable editing)
- On the imported framework, click **Enable editing** → confirm.
- ✅ Editing unlocks; the header shows **Derived**, and the home card flips
  from **Imported** to **Forked**.
- ✅ In a re-export, every node's `source` block becomes `derivedFrom` and the
  document has `isModifiedFromSource: true`.

## 5. Round-trip
- **Save**, reload the framework.
- ✅ Registry/external reference nodes reappear and their alignment edges
  re-link to them (no dangling/lost associations).
- ✅ A subsequent export still contains the alignment associations.
