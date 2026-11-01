import { expect, test } from 'bun:test';

test('registration and heartbeat report the configured Frame version', async () => {
  const probe = Bun.spawn(['bun', 'tests/fixtures/frame-version-probe.tsx'], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(probe.stdout).text(),
    new Response(probe.stderr).text(),
    probe.exited,
  ]);
  if (code !== 0) throw new Error(`Frame version probe failed:\n${stdout}${stderr}`);
  expect(stderr.trim()).toBe(
    'react-test-renderer is deprecated. See https://react.dev/warnings/react-test-renderer',
  );
}, 15_000);
