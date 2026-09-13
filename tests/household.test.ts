import test from 'node:test';
import assert from 'node:assert/strict';
import { createHouseholdState } from '../packages/frontend/household/fixtures.ts';
import { householdReducer } from '../packages/frontend/household/reducer.ts';
import { addDays, balances, canReadNote, draftAction, isDate, monthCells, nextDue, parseMoney, splitExpense } from '../packages/frontend/household/logic.ts';
import { DEMO_TODAY, SECTIONS, isHouseholdSection, type Draft, type EditorKind, type EditorRequest } from '../packages/frontend/household/model.ts';

function request(kind: EditorKind, id = 'new'): EditorRequest { return { kind, id, isNew: id === 'new', values: {} }; }
function save(kind: EditorKind, values: Draft) { return draftAction(request(kind), { title: 'Sample', date: DEMO_TODAY, member: 'nate', repeat: 'once', ...values }, createHouseholdState()); }

test('all eight household areas have distinct, validated deep-link identifiers', () => {
  assert.equal(SECTIONS.length, 8);
  assert.equal(new Set(SECTIONS.map(section => section.id)).size, 8);
  for (const section of SECTIONS) assert.equal(isHouseholdSection(section.id), true);
  for (const invalid of ['banking', '../notes', ['notes'], null]) assert.equal(isHouseholdSection(invalid), false);
});
test('each new session has independent mutable collections', () => {
  const first = createHouseholdState();
  first.shopping.pop();
  assert.equal(createHouseholdState().shopping.length, 5);
});
test('completing a recurring task advances its due date, rotates and records its actual completer', () => {
  let state = householdReducer(createHouseholdState(), { type: 'actor', id: 'sam' });
  state = householdReducer(state, { type: 'complete-task', id: 'task-clean' });
  const task = state.tasks.find(item => item.id === 'task-clean');
  assert.equal(task?.due, '2026-09-15');
  assert.equal(task?.assignee, 'alex');
  assert.equal(task?.completion?.by, 'sam');
});
test('undoing completion restores the due date and original assignment', () => {
  const original = createHouseholdState();
  const completed = householdReducer(original, { type: 'complete-task', id: 'task-trash' });
  const restored = householdReducer(completed, { type: 'complete-task', id: 'task-trash' });
  assert.equal(restored.tasks.find(task => task.id === 'task-trash')?.due, DEMO_TODAY);
  assert.equal(restored.tasks.find(task => task.id === 'task-trash')?.assignee, 'alex');
  assert.equal(restored.tasks.find(task => task.id === 'task-trash')?.completion, undefined);
});
test('daily tasks without rotation keep their assignee', () => {
  const state = householdReducer(createHouseholdState(), { type: 'complete-task', id: 'task-cat' });
  assert.equal(state.tasks.find(task => task.id === 'task-cat')?.assignee, 'sam');
});
test('monthly recurrence clamps end-of-month dates, including leap years', () => {
  assert.equal(nextDue('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(nextDue('2024-01-31', 'monthly'), '2024-02-29');
  assert.equal(nextDue('2026-12-31', 'monthly'), '2027-01-31');
  assert.equal(nextDue(DEMO_TODAY, 'once'), DEMO_TODAY);
});
test('shopping duplicate names are normalized instead of added twice', () => {
  const state = createHouseholdState();
  const next = householdReducer(state, { type: 'add-shopping', record: { id: 'another-milk', title: '  MILK  ', quantity: '1', category: 'Other', addedBy: 'nate' } });
  assert.equal(next.shopping.length, state.shopping.length);
});
test('any preview member can check another member’s item; undo removes the attribution', () => {
  let state = householdReducer(createHouseholdState(), { type: 'actor', id: 'sam' });
  state = householdReducer(state, { type: 'toggle-shopping', id: 'shop-milk' });
  assert.equal(state.shopping.find(item => item.id === 'shop-milk')?.checkedBy, 'sam');
  state = householdReducer(state, { type: 'toggle-shopping', id: 'shop-milk' });
  assert.equal(state.shopping.find(item => item.id === 'shop-milk')?.checkedBy, undefined);
});
test('adding a previously picked-up item reactivates it without duplicate IDs', () => {
  const state = householdReducer(createHouseholdState(), { type: 'add-shopping', record: { id: 'new-bread', title: 'Sourdough bread', quantity: '2', category: 'Bakery', addedBy: 'alex' } });
  assert.equal(state.shopping.length, 5);
  assert.equal(state.shopping.find(item => item.id === 'shop-bread')?.checkedBy, undefined);
  assert.equal(state.shopping.find(item => item.id === 'shop-bread')?.quantity, '2');
});
test('clearing shopping deletes only checked items', () => {
  const state = householdReducer(createHouseholdState(), { type: 'clear-shopping' });
  assert.equal(state.shopping.length, 4);
  assert.equal(state.shopping.some(item => item.id === 'shop-milk'), true);
});
test('dates reject calendar overflow and the month grid includes adjacent months', () => {
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(isDate('14/09/2026'), false);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  const cells = monthCells('2026-09-01');
  assert.equal(cells.length, 42);
  assert.equal(cells[0], '2026-08-31');
  assert.equal(cells[41], '2026-10-11');
});
test('calendar forms reject reversed ranges and invalid times', () => {
  assert.ok('error' in save('event', { endDate: '2026-09-13' }));
  assert.ok('error' in save('event', { time: '25:15' }));
  assert.ok('action' in save('event', { endDate: '2026-09-17', time: '19:30' }));
});
test('selected and private notes are omitted for unauthorized preview members', () => {
  const state = createHouseholdState();
  const garage = state.notes.find(note => note.id === 'note-garage');
  const personal = state.notes.find(note => note.id === 'note-private');
  assert.ok(garage && personal);
  assert.equal(canReadNote(garage, 'nate'), true);
  assert.equal(canReadNote(garage, 'alex'), true);
  assert.equal(canReadNote(garage, 'sam'), false);
  assert.equal(canReadNote(personal, 'alex'), true);
  assert.equal(canReadNote(personal, 'nate'), false);
});
test('a permitted reader cannot rewrite a note or its author in the reducer', () => {
  const state = createHouseholdState();
  const note = state.notes.find(item => item.id === 'note-cat');
  assert.ok(note);
  const updated = householdReducer(state, { type: 'save-note', record: { ...note, author: 'nate', body: 'not allowed' } });
  assert.equal(updated, state);
  const form = draftAction(request('note', note.id), { title: note.title, body: 'changed', access: 'home' }, state);
  assert.ok('error' in form);
});
test('restricted note forms need a reader and never retain irrelevant permissions', () => {
  assert.ok('error' in save('note', { body: 'Sample', access: 'selected', readers: 'nate' }));
  const result = save('note', { body: 'Sample', access: 'private', readers: 'alex,sam' });
  assert.ok('action' in result);
  if (result.action.type !== 'save-note') assert.fail('Wrong action');
  assert.deepEqual(result.action.record.readers, []);
});
test('package collection records the member and can be undone', () => {
  let state = householdReducer(createHouseholdState(), { type: 'actor', id: 'alex' });
  state = householdReducer(state, { type: 'advance-package', id: 'parcel-book' });
  assert.equal(state.packages.find(parcel => parcel.id === 'parcel-book')?.collectedBy, 'alex');
  state = householdReducer(state, { type: 'undo-collection', id: 'parcel-book' });
  assert.equal(state.packages.find(parcel => parcel.id === 'parcel-book')?.status, 'delivered');
});
test('editing a collected package retains its collector', () => {
  const state = createHouseholdState();
  const result = draftAction(request('package', 'parcel-cat'), { title: 'Renamed', date: DEMO_TODAY, member: 'sam' }, state);
  assert.ok('action' in result);
  if (result.action.type !== 'save-package') assert.fail('Wrong action');
  assert.equal(result.action.record.collectedBy, 'nate');
});
test('service recording is idempotent for a day and advances repeating maintenance', () => {
  let state = householdReducer(createHouseholdState(), { type: 'service-asset', id: 'asset-filter' });
  state = householdReducer(state, { type: 'service-asset', id: 'asset-filter' });
  const asset = state.assets.find(item => item.id === 'asset-filter');
  assert.equal(asset?.history.length, 2);
  assert.equal(asset?.due, '2026-10-14');
});
test('money parsing uses integer cents and rejects ambiguous, negative or overprecise input', () => {
  assert.equal(parseMoney('32'), 3200);
  assert.equal(parseMoney('32,50'), 3250);
  assert.equal(parseMoney('0.01'), 1);
  for (const invalid of ['0', '-1', '1.234', '1,000.00', 'NaN', '1e3', '']) assert.equal(parseMoney(invalid), null);
});
test('uneven splits sum exactly and do not depend on participant order', () => {
  const shares = splitExpense({ cents: 3200, participants: ['sam', 'nate', 'alex'] });
  assert.deepEqual(shares.map(share => share.cents), [1067, 1067, 1066]);
  assert.equal(shares.reduce((sum, share) => sum + share.cents, 0), 3200);
  assert.deepEqual(splitExpense({ cents: 1, participants: ['nate', 'alex', 'sam'] }).map(share => share.cents), [1, 0, 0]);
});
test('balances are zero-sum; unpaid expenses and settled splits are excluded', () => {
  const state = createHouseholdState();
  assert.equal(Object.values(balances(state.expenses)).reduce((sum, value) => sum + value, 0), 0);
  assert.deepEqual(balances(state.expenses.filter(expense => !expense.paid)), { nate: 0, alex: 0, sam: 0 });
  assert.deepEqual(balances(state.expenses.map(expense => ({ ...expense, settled: true }))), { nate: 0, alex: 0, sam: 0 });
});
test('an unpaid bill cannot be settled and expense forms require participants', () => {
  const state = householdReducer(createHouseholdState(), { type: 'settle-expense', id: 'expense-water' });
  assert.equal(state.expenses.find(expense => expense.id === 'expense-water')?.settled, false);
  assert.ok('error' in save('expense', { amount: '32', participants: '' }));
});
test('meal ingredients feed shopping without duplication on repeat clicks', () => {
  let state = householdReducer(createHouseholdState(), { type: 'shop-meal', id: 'meal-pasta' });
  assert.equal(state.shopping.length, 8);
  state = householdReducer(state, { type: 'shop-meal', id: 'meal-pasta' });
  assert.equal(state.shopping.length, 8);
});
test('edited recipe ingredients cannot produce duplicate shopping IDs', () => {
  let state = householdReducer(createHouseholdState(), { type: 'shop-meal', id: 'meal-pasta' });
  const meal = state.meals.find(item => item.id === 'meal-pasta');
  assert.ok(meal);
  state = householdReducer(state, { type: 'save-meal', record: { ...meal, ingredients: ['Lemon', 'Pasta'] } });
  state = householdReducer(state, { type: 'shop-meal', id: 'meal-pasta' });
  assert.equal(new Set(state.shopping.map(item => item.id)).size, state.shopping.length);
});
test('available pantry food is skipped, but expired or used food is added to shopping', () => {
  let state = createHouseholdState();
  const meal = state.meals[0];
  assert.ok(meal);
  state = householdReducer(state, { type: 'save-meal', record: { ...meal, ingredients: ['Baby spinach'] } });
  state = householdReducer(state, { type: 'shop-meal', id: meal.id });
  assert.equal(state.shopping.length, 5);
  state = householdReducer(state, { type: 'use-pantry', id: 'pantry-spinach' });
  state = householdReducer(state, { type: 'shop-meal', id: meal.id });
  assert.equal(state.shopping.length, 6);
});
test('saving drafts validates blank titles, fake members and impossible dates', () => {
  assert.ok('error' in save('task', { title: '  ' }));
  assert.ok('error' in save('task', { member: 'unknown' }));
  assert.ok('error' in save('asset', { warranty: 'not a date' }));
  assert.ok('error' in save('pantry', { date: '2026-13-01' }));
});
