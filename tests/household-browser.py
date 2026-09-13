"""Exercise the actual Expo web export, not a DOM adapter. No external accounts are used."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re
import threading
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'packages/frontend/dist'
OUTPUT = ROOT / 'household-web-review'
OUTPUT.mkdir(exist_ok=True)

class AppHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        requested = Path(self.translate_path(urlparse(self.path).path))
        if not requested.is_file() and not (requested / 'index.html').is_file():
            self.path = '/index.html'
        super().do_GET()
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(AppHandler, directory=str(DIST)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
SCREENS = {
    '': 'Household', 'tasks': 'Tasks & routines', 'shopping': 'Shopping',
    'calendar': 'Home calendar', 'notes': 'Home notes', 'packages': 'Packages',
    'maintenance': 'Maintenance', 'expenses': 'Bills & shared expenses', 'meals': 'Meals',
}
results, errors = [], []
expect.set_options(timeout=15000)
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.on('pageerror', lambda error: errors.append(str(error)))
        # The optional identity provider needs a base URL; no real Oxy service is used.
        page.route('https://oxy-preview.invalid/**', lambda route: route.fulfill(status=401, content_type='application/json', body='{}'))
        page.set_default_timeout(20000)
        for width, height in [(390, 844), (834, 1112), (1440, 1000)]:
            page.set_viewport_size({'width': width, 'height': height})
            for section, title in SCREENS.items():
                page.goto(f'{BASE}/household/{section}')
                try:
                    expect(page.get_by_role('heading', name=title, exact=True)).to_be_visible()
                except AssertionError:
                    page.screenshot(path=str(OUTPUT / 'failure.png'))
                    (OUTPUT / 'failure.html').write_text(page.content())
                    raise
                page.wait_for_timeout(250)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), (section, width, 'horizontal overflow')
                assert not errors, errors
                page.screenshot(path=str(OUTPUT / f'{section or "overview"}-{width}.png'))
                results.append({'screen': section or 'overview', 'width': width, 'passed': True})

        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(f'{BASE}/household/tasks')
        page.get_by_role('checkbox', name='Complete Freshen up the kitchen', exact=True).click()
        page.get_by_role('button', name='Completed', exact=True).click()
        expect(page.get_by_text(re.compile(r'Done by Nate.*Alex'))).to_be_visible()
        page.set_viewport_size({'width': 1440, 'height': 1000})
        expect(page.get_by_role('checkbox', name='Undo Freshen up the kitchen', exact=True)).to_be_checked()
        page.get_by_role('checkbox', name='Undo Freshen up the kitchen', exact=True).click()
        page.get_by_role('button', name='Today', exact=True).click()
        page.get_by_role('button', name='+ Add', exact=True).click()
        page.get_by_role('textbox', name='Name', exact=True).fill('Sweep the balcony')
        page.get_by_role('button', name='Save task', exact=True).click()
        expect(page.get_by_text('Sweep the balcony', exact=True)).to_be_visible()
        results.append({'flow': 'Task completion, rotation, undo, resize and creation', 'passed': True})

        page.goto(f'{BASE}/household/shopping')
        page.get_by_role('button', name='Sam', exact=True).click()
        page.get_by_role('checkbox', name='Mark Milk picked up', exact=True).click()
        page.get_by_role('button', name='Picked up · 2', exact=True).click()
        expect(page.get_by_text('2 cartons · Picked up by Sam', exact=True)).to_be_visible()
        results.append({'flow': 'Shopping attribution across preview members', 'passed': True})

        page.goto(f'{BASE}/household/notes')
        page.get_by_role('button', name='Read Garage access', exact=True).click()
        page.get_by_role('button', name='Sam', exact=True).click()
        expect(page.get_by_text('Garage access', exact=True)).to_have_count(0)
        page.get_by_role('button', name='Alex', exact=True).click()
        expect(page.get_by_role('button', name='Read A birthday surprise', exact=True)).to_be_visible()
        page.get_by_role('button', name='Nate', exact=True).click()
        expect(page.get_by_role('button', name='Read A birthday surprise', exact=True)).to_have_count(0)
        results.append({'flow': 'Restricted note content disappears on member switch', 'passed': True})

        page.goto(f'{BASE}/household/meals')
        page.get_by_role('button', name='Add missing ingredients to shopping', exact=True).click()
        page.get_by_role('button', name='Open shopping list', exact=True).click()
        expect(page.get_by_role('heading', name='Shopping', exact=True)).to_be_visible()
        # The router may retain the previous meal screen, which also contains the word Pasta.
        # Assert the actual, interactive shopping item rather than matching duplicate text.
        expect(page.get_by_role('checkbox', name='Mark Pasta picked up', exact=True)).to_be_visible()
        page.get_by_role('checkbox', name='Mark Pasta picked up', exact=True).click()
        expect(page.get_by_role('button', name='Picked up · 2', exact=True)).to_be_visible()
        results.append({'flow': 'Meal ingredients reach shopping across real router navigation', 'passed': True})
        assert not errors, errors
        browser.close()
finally:
    server.shutdown()
    (OUTPUT / 'results.json').write_text(json.dumps({'runtime': 'Actual exported Expo web app in Chromium', 'checks': results, 'errors': errors}, indent=2))
print(f'{len(results)} real-browser checks passed')
