import { test, expect } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('camera views release private images and discard previous-account responses', () => {
  const result = spawnSync(
    'bun',
    [fileURLToPath(new URL('./fixtures/camera-probe.tsx', import.meta.url))],
    { encoding: 'utf8', timeout: 15000, env: process.env },
  );
  expect({ exit: result.status, error: result.error?.message, stderr: result.stderr }).toEqual({
    exit: 0,
    error: undefined,
    stderr: '',
  });
  expect(result.stdout).toBe('WILLO_CAMERA_OK\n');
}, 20000);
