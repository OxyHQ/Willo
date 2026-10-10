/**
 * Runtime secrets live in SSM Parameter Store, and no workflow writes one.
 *
 * Until 2026-10-10 `deploy-aws.yml` copied GitHub repo secrets into SSM
 * `/oxy/willo/*` on every deploy, which made GitHub the source of truth for
 * production credentials: whoever could edit a repo secret could change what
 * production ran with, and every value lived in two systems. SSM (SecureString)
 * is now the only source; a value is set or rotated with
 * `aws ssm put-parameter --overwrite` by its owner (oxy-infra
 * docs/runbooks/46-app-secrets-in-ssm.md), never by a workflow.
 *
 * Every workflow is read, not only the deploy, and comment lines are dropped
 * first so the explanation in the workflow cannot trip the assertions.
 * `toJSON(secrets)` stays prohibited by name: besides reading every secret, it
 * is the shape GitHub's malicious-workflow detection matches, which holds every
 * run at `action_required` with zero jobs until a human approves it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKFLOWS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows');

/** What CI itself spends. Nothing here is read by the running service. */
const CI_ONLY_SECRETS = new Set([
  'ADD_TO_PROJECT_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'GITHUB_TOKEN',
  'NPM_TOKEN',
]);

const workflows = readdirSync(WORKFLOWS_DIR)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .map((file) => ({
    file,
    executable: readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n'),
  }));

const secretsReadBy = (executable: string): string[] =>
  [...executable.matchAll(/\bsecrets\.([A-Za-z0-9_]+)/g)].map((match) => match[1]);

const deploy = workflows.find(({ file }) => file === 'deploy-aws.yml');

test('the guard reads every workflow, including the deploy', () => {
  // Vacuity floor: a misdirected directory read would make every check below
  // pass against nothing.
  assert.ok(deploy, 'deploy-aws.yml was not read');
  assert.match(deploy.executable, /aws ecs update-service/);
});

test('no workflow writes an SSM parameter', () => {
  for (const { file, executable } of workflows) {
    assert.doesNotMatch(executable, /ssm\s+put-parameter/, `${file} writes SSM`);
  }
});

test('no workflow enumerates the whole secrets context', () => {
  for (const { file, executable } of workflows) {
    assert.doesNotMatch(executable, /\$\{\{[^}]*toJSON\s*\(\s*secrets\s*\)/, file);
  }
});

test('no workflow reads a repo secret outside the CI-only allowlist', () => {
  const named = workflows.flatMap(({ executable }) => secretsReadBy(executable));
  assert.ok(named.length > 0, 'no secret is read anywhere, so the matcher measures nothing');
  for (const name of new Set(named)) {
    assert.ok(CI_ONLY_SECRETS.has(name), `a workflow reads app secret ${name} from GitHub`);
  }
});

test('the deploy reads no GitHub secret at all', () => {
  assert.deepEqual(secretsReadBy(deploy?.executable ?? ''), []);
});
