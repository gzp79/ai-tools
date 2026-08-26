---
description: Lint every SKILL.md (frontmatter, name↔dir, lengths) and validate the plugin/marketplace manifests before sharing.
---

Run the repo's skill validator and the official plugin validator, then report any problems.

1. `node scripts/validate-skills.mjs`
2. `claude plugin validate .` (validates `.claude-plugin/marketplace.json` and each plugin)

Summarize failures concisely with the file and the fix. If both pass, say so.
