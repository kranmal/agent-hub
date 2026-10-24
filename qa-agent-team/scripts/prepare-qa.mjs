#!/usr/bin/env node
// Make sure <project>/qa/ exists (scaffold + npm install + Chromium) BEFORE a run that uses the
// Playwright agents, because their MCP server starts with the session and needs qa/playwright.config.ts.
// Usage: node prepare-qa.mjs [project-dir]      Safe to run again: it never overwrites an existing qa/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const project = path.resolve(process.argv[2] || process.cwd());
const target = process.argv[3] || '';
const qa = path.join(project, 'qa');
const scaffold = path.join(os.homedir(), '.claude/skills/qa-playwright/assets/scaffold/qa');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

if (!fs.existsSync(path.join(qa, 'playwright.config.ts'))) {
  if (!fs.existsSync(scaffold)) { console.error(`QA skill not found at ${scaffold}. Run ./install.sh first.`); process.exit(1); }
  fs.cpSync(scaffold, qa, { recursive: true });
  console.log('Scaffolded', qa);
}
if (!fs.existsSync(path.join(qa, 'node_modules/@playwright/test'))) run('npm', ['install', '--no-audit', '--no-fund'], qa);
run('npx', ['playwright', 'install', 'chromium'], qa);

// Seed test for the planner and generator (they run it to get a ready page). It lives in tests/e2e so the
// "e2e" project matches it, and opens the full base URL (a bare "/" has no base when the MCP server ignores BASE_URL).
const seed = path.join(qa, 'tests/e2e/seed.spec.ts');
if (!fs.existsSync(seed)) {
  fs.mkdirSync(path.dirname(seed), { recursive: true });
  const url = JSON.stringify(target);
  fs.writeFileSync(seed, `import { test } from '@playwright/test';\n\ntest.describe('Seed', () => {\n  test('seed', async ({ page, baseURL }) => {\n    await page.goto(process.env.BASE_URL || ${url} || baseURL || '/');\n  });\n});\n`);
}
fs.mkdirSync(path.join(qa, 'specs'), { recursive: true });
console.log('Ready:', qa);
