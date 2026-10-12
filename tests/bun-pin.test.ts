/**
 * `packageManager` in the root package.json is the one bun pin.
 *
 * Every workflow's `oven-sh/setup-bun` reads it (`bun-version-file:
 * package.json`), so CI, the frontend deploy and the lockfile cannot disagree
 * about which bun wrote bun.lock. The backend image cannot read it: its
 * `FROM oven/bun:<tag>` is a literal, so a bump that misses it builds the image
 * with a different bun from the one that wrote bun.lock and that CI tested
 * with. The image's frozen install then either fails in the deploy or, worse,
 * passes on a bun nobody tested. This holds every bun reference in every
 * Dockerfile (`FROM`, `COPY --from`, `ARG BUN_VERSION`) to the pin, and keeps
 * literal versions out of the workflows.
 *
 * Comment lines are dropped first, so a commented-out stage or an explanation
 * that names a version cannot satisfy or trip the checks.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');

const executableLines = (path: string): string[] =>
  readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'));

const pinnedBun = /^bun@(\d+\.\d+\.\d+)$/.exec(
  String(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).packageManager ?? ''),
)?.[1];

const dockerfiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((path) => /(^|\/)Dockerfile[^/]*$/.test(path) && !path.endsWith('.dockerignore'));

/** Every bun version a Dockerfile names, with where it named it. */
const imageBunReferences = dockerfiles.flatMap((file) =>
  executableLines(join(ROOT, file)).flatMap((raw) => {
    const line = raw.trim();
    const from = /^FROM\s+(?:--\S+\s+)*(?:docker\.io\/)?oven\/bun(?::([^\s@]+))?/i.exec(line);
    const copyFrom = /--from=(?:docker\.io\/)?oven\/bun(?::([^\s@]+))?/i.exec(line);
    const arg = /^ARG\s+BUN_VERSION(?:=(\S*))?/i.exec(line);
    const match = from ?? copyFrom;
    if (match) return [{ file, line, version: (match[1] ?? 'latest').split('-')[0] }];
    if (arg) return [{ file, line, version: arg[1] || '(unset)' }];
    return [];
  }),
);

const workflows = readdirSync(WORKFLOWS_DIR)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .map((file) => ({ file, lines: executableLines(join(WORKFLOWS_DIR, file)) }));

/** Each `oven-sh/setup-bun` step: its own lines, and whether a checkout ran before it. */
const setupBunSteps = workflows.flatMap(({ file, lines }) =>
  lines.flatMap((line, index) => {
    if (!/uses:\s*oven-sh\/setup-bun@/.test(line)) return [];
    const dashIndent = line.indexOf('-');
    const rest = lines.slice(index + 1);
    const end = rest.findIndex((next) => next.trim() !== '' && next.search(/\S/) <= dashIndent);
    const step = [line, ...(end === -1 ? rest : rest.slice(0, end))];
    const checkedOutBefore = lines
      .slice(0, index)
      .some((prior) => /actions\/checkout@/.test(prior));
    return [{ file, step, checkedOutBefore }];
  }),
);

test('package.json pins packageManager as bun@<x.y.z>', () => {
  assert.ok(pinnedBun, 'root package.json must pin `packageManager` as bun@<x.y.z>');
});

test('every oven/bun reference in a Dockerfile runs the pinned bun', () => {
  // Vacuity floor: a misread file list or a renamed image would make the
  // comparison below pass against nothing.
  assert.ok(dockerfiles.length > 0, 'no Dockerfile is tracked, so the pin check measures nothing');
  assert.ok(
    imageBunReferences.length > 0,
    `no \`oven/bun\` reference parsed out of ${dockerfiles.join(', ')}; the pin check would measure nothing`,
  );
  for (const { file, line, version } of imageBunReferences) {
    assert.equal(
      version,
      pinnedBun,
      `${file}: \`${line}\` runs bun ${version}, but package.json pins bun@${pinnedBun}. ` +
        'The image must run the bun that wrote bun.lock and that CI tests with.',
    );
  }
});

test('every setup-bun step reads the pin from package.json after a checkout', () => {
  assert.ok(setupBunSteps.length > 0, 'no oven-sh/setup-bun step found in any workflow');
  for (const { file, step, checkedOutBefore } of setupBunSteps) {
    assert.ok(
      step.some((line) => /^\s*bun-version-file:\s*['"]?package\.json['"]?\s*$/.test(line)),
      `${file}: setup-bun must use \`bun-version-file: package.json\`, not a literal or the latest bun`,
    );
    assert.ok(
      checkedOutBefore,
      `${file}: setup-bun reads package.json, so a checkout must run first`,
    );
  }
});

test('no workflow names a bun version of its own', () => {
  for (const { file, lines } of workflows) {
    for (const line of lines) {
      assert.doesNotMatch(
        line,
        /\bbun-version:|\bBUN_VERSION\b/,
        `${file}: \`${line.trim()}\` names a bun version; read it from package.json instead`,
      );
    }
  }
});
