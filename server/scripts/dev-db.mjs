// Local Postgres for development/tests — no Docker, no install.
// Usage: node scripts/dev-db.mjs [stop]
// DATABASE_URL=postgresql://postgres:postgres@localhost:5433/replydesk
// Starts via pg_ctl because postgres refuses to run directly under an admin account on Windows.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = fileURLToPath(new URL('../.devdb', import.meta.url));
const binDir = fileURLToPath(new URL(`../node_modules/@embedded-postgres/${process.platform === 'win32' ? 'windows' : process.platform}-x64/native/bin`, import.meta.url));
const pgCtl = path.join(binDir, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');

if (!existsSync(dir)) {
  // initdb on Windows defaults to WIN1252 → Thai text fails with 22P05. Force UTF8.
  await new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port: 5433, initdbFlags: ['--encoding=UTF8', '--locale=C'] }).initialise();
}

const action = process.argv[2] === 'stop' ? ['stop', '-D', dir, '-m', 'fast'] : ['start', '-D', dir, '-o', '-p 5433', '-l', path.join(dir, 'server.log')];
// detached + ignored stdio: pg_ctl's child keeps inherited handles open otherwise and the script never exits
spawn(pgCtl, action, { detached: true, stdio: 'ignore' }).unref();
if (action[0] === 'stop') process.exit(0);

const { default: pg } = await import('pg');
for (let i = 0; i < 30; i++) {
  const c = new pg.Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'postgres', database: 'postgres' });
  try {
    await c.connect();
    await c.query('create database replydesk').catch(() => {});
    await c.end();
    console.log('dev db ready: postgresql://postgres:postgres@localhost:5433/replydesk');
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
console.error('dev db did not start — see .devdb/server.log');
process.exit(1);
