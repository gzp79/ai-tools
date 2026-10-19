# ai-tools

Personal, version-controlled collection of Claude Code **skills** (shared across
projects via a plugin marketplace) and standalone **tools**.

## Skills — use them in any repo

This repo is a Claude Code plugin marketplace. In another repo:

```
/plugin marketplace add gzp79/ai-tools
/plugin install shine-skills@ai-tools
```

Or auto-enable it in a repo by committing to its `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "ai-tools": { "source": { "source": "github", "repo": "gzp79/ai-tools" } }
  },
  "enabledPlugins": ["shine-skills@ai-tools"]
}
```

Pull updates with `/plugin marketplace update ai-tools`.

**Shipped skills** (`plugins/shine-skills/skills/`):
- `sdp` — Spec-Driven Practice: keep a feature's Markdown (Mermaid) design doc and its code in sync.

## Tools

Standalone scripts under `tools/` (run manually; not wired into Claude). See each
tool's own README:
- `tools/aws/` — Bedrock usage/cost/logging-audit scripts.
- `tools/hp-translator/` — userscript + local server.

## Developing here

See [CLAUDE.md](CLAUDE.md) for how to author a skill. Validate before sharing:

```
node scripts/validate-skills.mjs
claude plugin validate .
```
