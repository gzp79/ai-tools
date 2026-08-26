#!/usr/bin/env node
// Validate every SKILL.md in the repo before sharing.
// Checks: file exists per skill dir, YAML frontmatter present, required
// fields (name, description), name matches its directory, and lengths are sane.
// Usage: node scripts/validate-skills.mjs [rootDir]  (default: repo root)

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = process.argv[2]
  ? process.argv[2]
  : join(dirname(fileURLToPath(import.meta.url)), '..');

// Find every SKILL.md under the repo (skip node_modules / .git).
function findSkillFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      findSkillFiles(full, acc);
    } else if (entry.name === 'SKILL.md') {
      acc.push(full);
    }
  }
  return acc;
}

// Minimal, dependency-free frontmatter parse: grab the block between the
// first pair of `---` lines and read top-level `key:` values (enough for
// name/description validation; not a full YAML parser).
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  let currentKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      currentKey = kv[1];
      fields[currentKey] = kv[2].replace(/^["']|["']$/g, '').trim();
    } else if (currentKey && /^\s+\S/.test(line)) {
      // continuation of a folded/multi-line value (e.g. `description: >`)
      fields[currentKey] = (fields[currentKey] + ' ' + line.trim()).trim();
    }
  }
  return fields;
}

const files = findSkillFiles(repoRoot);
if (files.length === 0) {
  console.error('No SKILL.md files found under', repoRoot);
  process.exit(1);
}

let hadError = false;
const problem = (file, msg) => {
  hadError = true;
  console.error(`  ✗ ${relative(repoRoot, file)}: ${msg}`);
};

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm) {
    problem(file, 'missing YAML frontmatter (--- block)');
    continue;
  }
  if (!fm.name) problem(file, 'frontmatter missing "name"');
  if (!fm.description) problem(file, 'frontmatter missing "description"');

  const skillDir = basename(dirname(file));
  if (fm.name && fm.name !== skillDir) {
    problem(file, `name "${fm.name}" does not match directory "${skillDir}"`);
  }
  if (fm.name && !/^[a-z0-9][a-z0-9-]*$/.test(fm.name)) {
    problem(file, `name "${fm.name}" should be lower-kebab-case`);
  }
  if (fm.description && fm.description.length > 1024) {
    problem(file, `description is ${fm.description.length} chars (keep < 1024)`);
  }
}

if (hadError) {
  console.error(`\nValidation failed for ${files.length} skill file(s).`);
  process.exit(1);
}
console.log(`✓ ${files.length} skill(s) valid.`);
