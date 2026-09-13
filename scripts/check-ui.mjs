/** Tests the real Expo export, never the ZIP's DOM preview adapter. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve('packages/frontend/dist');
const artifacts = resolve('ui-artifacts');
await mkdir(artifacts, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    if (!extname(file)) {
      const html = file + '.html';
      file = await stat(html).then(() => html).catch(() => join(root, 'index.html'));
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
const modulePath = process.env.PLAYWRIGHT_MODULE;
assert.ok(modulePath, 'Set PLAYWRIGHT_MODULE to an installed playwright/index.mjs');
const { chromium } = await import(pathToFileURL(modulePath).href);
const browser = await chromium.launch();
const results = [];
let failure;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const routes = ['home', 'activity', 'automations', 'assistant', 'composer', 'emergency', 'favorites', 'devices', 'routines', 'timeline', 'settings', 'favorites-assistant'];
  const noTabs = new Set(['assistant', 'composer', 'emergency']);
  for (const [width, height] of [[390, 844], [834, 1194], [1024, 768], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      const before = errors.length;
      const response = await page.goto(`${origin}/${route}`);
      assert.equal(response?.status(), 200, route);
      await page.getByTestId('screen-surface').waitFor();
      await page.waitForTimeout(350);
      assert.equal(await page.getByTestId('navigation-rail').count(), width >= 600 ? 1 : 0, route);
      assert.equal(await page.getByTestId('bottom-navigation').count(), width < 600 && !noTabs.has(route) ? 1 : 0, route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route}: horizontal overflow`);
      assert.deepEqual(errors.slice(before), [], `${route}: runtime error`);
      if (route === 'home') {
        const background = await page.getByTestId('card-lock').getByRole('switch').evaluate(el => getComputedStyle(el).backgroundColor);
        assert.equal(background, 'rgb(217, 225, 255)', 'NativeWind Home theme is missing');
        const boxes = await page.locator('[data-testid^="card-"]').evaluateAll(elements => elements.map(el => {
          const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
        }));
        for (const [i, a] of boxes.entries()) {
          assert.ok(a.width > 0 && a.height > 0 && a.x >= 0 && a.x + a.width <= width + 1);
          for (const b of boxes.slice(i + 1)) {
            const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
            const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            assert.ok(x <= 1 || y <= 1, 'Dashboard cards overlap');
          }
        }
      }
      await page.screenshot({ path: join(artifacts, `${route}-${width}.png`) });
      results.push({ route, width, height, status: 'passed' });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/home`);
  await page.getByRole('button', { name: 'Increase temperature', exact: true }).click();
  assert.equal((await page.getByTestId('thermostat-value').innerText()).trim(), '69');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId('navigation-rail').waitFor();
  assert.equal((await page.getByTestId('thermostat-value').innerText()).trim(), '69', 'Resize reset state');
  await page.getByRole('button', { name: 'Cameras', exact: true }).click();
  assert.equal(await page.locator('[data-testid^="card-"]').count(), 2);
  await page.getByRole('tab', { name: 'Activity', exact: true }).click();
  await page.waitForURL('**/activity');
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.waitForURL('**/home');
  await page.goto(`${origin}/composer`);
  await page.getByRole('textbox', { name: 'Describe your automation' }).fill('When I leave home turn off the living room lights');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.getByRole('textbox', { name: 'Describe your automation' }).inputValue(), 'When I leave home turn off the living room lights');
  assert.deepEqual(errors, []);
  results.push({ status: 'passed', check: 'Temperature, categories, routing and draft preservation on resize' });
} catch (error) {
  failure = error;
  results.push({ status: 'failed', error: String(error) });
} finally {
  await writeFile(join(artifacts, 'results.json'), JSON.stringify(results, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
if (failure) throw failure;
console.log(`${results.length} web verification cases passed.`);
