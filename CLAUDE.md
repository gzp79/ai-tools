# ai-tools

This repo is **both** a normal project and a **Claude Code plugin marketplace**. It
holds skills shared across gzp79's projects, plus standalone CLI tools.

## Layout

```
.claude-plugin/marketplace.json      # marketplace "ai-tools" → lists the plugin(s)
plugins/shine-skills/                # the shareable plugin
  .claude-plugin/plugin.json         # plugin manifest (name, version, ...)
  skills/<name>/SKILL.md             # each skill (SKILL.md must be UPPERCASE)
.claude/                             # repo-LOCAL config for authoring here (NOT shipped)
scripts/validate-skills.mjs          # lints SKILL.md frontmatter/structure
tools/                               # standalone scripts (not wired into Claude yet)
```

The marketplace and the plugin's components live at their respective roots — only
`plugin.json`/`marketplace.json` go inside a `.claude-plugin/` dir; `skills/` sits
at the plugin root.

## Authoring a skill

1. Create `plugins/shine-skills/skills/<name>/SKILL.md` with YAML frontmatter:
   `name` (must equal the directory, lower-kebab-case) and a `description` that says
   when to trigger. Use the `superpowers:writing-skills` skill for structure/style.
2. Put supporting files under the skill dir (`references/`, `scripts/`).
3. Bump `version` in `plugins/shine-skills/.claude-plugin/plugin.json`.
4. Validate: `/validate-skills` (or `node scripts/validate-skills.mjs` +
   `claude plugin validate .`).
5. Commit and push. Consumers pick it up with `/plugin marketplace update ai-tools`.

## Using these skills in another repo

```
/plugin marketplace add gzp79/ai-tools
/plugin install shine-skills@ai-tools
```

To make it automatic for a repo (and every machine), add to that repo's
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "ai-tools": { "source": { "source": "github", "repo": "gzp79/ai-tools" } }
  },
  "enabledPlugins": ["shine-skills@ai-tools"]
}
```

Update everywhere by pushing here, then `/plugin marketplace update ai-tools` in the
consumer.
