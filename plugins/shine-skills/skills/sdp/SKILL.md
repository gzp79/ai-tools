---
name: sdp
description: >
    Use when a feature's design doc (docs/<domain>/<feature>.md) and its code
    need to agree: spec out or design a feature, write or update its doc,
    implement code from a doc, refresh a stale doc from the code, or resolve
    "the doc says X but the code does Y". Triggers on "spec out", "plan a
    feature", "implement the doc", "make the code match the doc", "sync the
    doc", "doc is stale", "check this doc", explicit sdp.
---

# SDP — Spec-Driven Practice (doc ↔ code)

A feature lives as a short Markdown design doc and as code. This skill keeps the
two in agreement. First job: **detect which side is ahead**, then move the other
to match; ask only when that is genuinely unclear. It never runs git or commits —
the user reviews and stages.

Doc location and domain layout are project facts (CLAUDE.md → _Design docs_).
The doc format is a strict contract:
[references/conventions.md](references/conventions.md) — read it once per session
before writing or judging a doc.

## Preamble (every run)

1. **Locate the doc** from the project's doc layout and the filename rules in
   conventions. Glob to confirm it exists or is missing. Ambiguous feature,
   domain, or target → ask.
2. **Conformance check** (doc exists): run the conformance checklist from
   conventions. Mechanical fixes (filename suffix, untagged collapsible, stray
   date/status line, change badges, change-log prose, roadmap boxes, missing file
   map) are applied inline. A fix that would change _meaning_ rather than form is
   a design question — ask.

## Detect direction

Combine the code survey (below) with the request wording; don't guess when they
disagree.

| Situation                                                    | Direction | Route                                      |
| ------------------------------------------------------------ | --------- | ------------------------------------------ |
| No doc, feature is new                                       | doc leads | **Write doc**                              |
| Doc exists, code missing or behind                           | doc leads | **Write code**                             |
| Code exists, doc missing or stale                            | code leads| **Sync doc**                               |
| Both moved, genuinely contradict, or unclear which is right  | —         | **Ask** which is the source of truth, then change the losing side |

No standing "doc wins" default. Verbs hint ("design / implement the doc" → doc
leads; "sync / doc is stale" → code leads) but confirm against reality: "implement
the doc" when the code already moved _past_ it is the ambiguous row — ask.

**Surveying the code** (Write code, Sync doc): start from the doc's file map. If
it has ≥6 entries, ≥3 top-level dirs, or the behaviour isn't locatable from it,
run parallel Explore agents; otherwise read directly. Verify contracts from
source — never copy an agent's paraphrase into a doc or plan.

## Write doc (new feature or intent-driven change)

1. Survey existing code first so you don't design against shipped behaviour.
2. Brainstorm via `superpowers:brainstorming`, telling it the artifact is the
   Markdown doc at the doc path and to skip its own spec-write step. Skip only for
   a small, well-understood edit.
3. Write per conventions: standard sections, Mermaid diagram chosen by flow shape.
   Edit existing docs surgically — never regenerate from template.
4. A collapsible for a not-yet-built feature may carry intent to the implementer;
   mark it `data-transient="true"` so a later sync drops it.
5. Self-review against the conventions checklist; hand off the path (next step is
   usually **Write code**).

## Write code (doc → code)

The doc is ahead; never edit it here — if the doc should change, re-check
_Detect direction_.

1. Read the doc: diagram, key rules, file map, and `data-agent` blocks.
   `data-transient` blocks are intent to consume now and prune later.
2. Survey the code and diff: Matches / Missing / Wrong / Stale / Ambiguous. A
   design ambiguity is a doc change — stop and ask.
3. Confirm scope as a short diff list; suggest splitting if large.
4. Route by size. **Small** (few low-risk items, no architectural or
   cross-cutting decisions): offer {implement directly / plan first}. **Otherwise**
   invoke `superpowers:writing-plans` with the doc path, the diff, relevant
   `data-agent` blocks, and constraints "match the doc; no redesign; no doc edits".
5. Hand off: plan path (then `executing-plans`) or what changed. If drift
   appeared or transient blocks now have code, run **Sync doc** and name the
   blocks to prune.

## Sync doc (code → doc)

Code is reality; refresh the doc, after which the doc is primary again.

1. Survey the code from the file map.
2. Diff per section: In sync / Drifted / Removed / New-in-code / Suspicious.
   Collect _prune_ candidates: `data-transient` blocks whose code now exists, and
   blocks that merely restate readable code.
3. Show a short bullet diff incl. prunes. Ask only about _Suspicious_ items
   (look accidental, not designed); apply clear drift and routine prunes.
4. Rewrite surgically. Replace prose that paraphrases code with a source
   reference; keep collapsibles only for durable insight. The result states the
   current design — no diff narrative, no "previously".
5. Read fresh: does the doc predict the code? Hand off what changed and pending
   decisions.

## Asking

Batch questions in one `AskUserQuestion`, yes/no where possible. Core question —
**which is the source of truth?** {Doc is right → change code / Code is right →
sync doc}; never pick silently on a real design disagreement. Others: suspicious
code item → {Document it / Leave out}; ambiguous target → list candidate paths;
meaning-changing conformance fix → confirm intent.

## Anti-patterns

- Running git or committing.
- Silent rewrites in Sync (show the diff first); regenerating a doc when a
  surgical edit suffices.
- Change-log narrative, "today vs proposed", change badges, dates, status lines,
  roadmap content (git owns history).
- Prose where a diagram fits; diagram nodes for non-participants.
- Collapsibles that paraphrase code or outlive their code.
- Editing the doc in **Write code**, or code in **Write doc** / **Sync doc**.
- Baking accidental code into the doc during Sync — flag it Suspicious.
- Skipping brainstorm on a genuinely new feature.
