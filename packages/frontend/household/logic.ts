import { DEMO_TODAY, MEMBERS, type Draft, type EditorRequest, type Action, type Expense, type HomeNote, type HouseholdState, type MemberId, type Repeat } from './model';

export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01' && value <= '2200-12-31';
}
export function addDays(value: string, count: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function nextDue(value: string, repeat: Repeat): string {
  if (repeat === 'once') return value;
  if (repeat !== 'monthly') return addDays(value, repeat === 'daily' ? 1 : 7);
  const date = new Date(`${value}T12:00:00Z`);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 2, 0)).getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + 1, Math.min(date.getUTCDate(), lastDay));
  return date.toISOString().slice(0, 10);
}
export function monthCells(month: string): string[] {
  const start = `${month.slice(0, 7)}-01`;
  const offset = (new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => addDays(start, index - offset));
}
export function moveMonth(month: string, amount: number): string {
  const date = new Date(`${month.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}
export function formatDay(value: string, full = false) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: full ? 'long' : 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
}
export function money(cents: number) { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100); }
export function parseMoney(value: string): number | null {
  if (!/^\d{1,6}([.,]\d{1,2})?$/.test(value.trim())) return null;
  const [whole = '0', fraction = ''] = value.trim().replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents > 0 ? cents : null;
}
export function splitExpense(expense: Pick<Expense, 'cents' | 'participants'>): { member: MemberId; cents: number }[] {
  const participants = MEMBERS.filter(member => expense.participants.includes(member.id));
  if (!participants.length) return [];
  const share = Math.floor(expense.cents / participants.length);
  const remainder = expense.cents % participants.length;
  return participants.map((member, index) => ({ member: member.id, cents: share + (index < remainder ? 1 : 0) }));
}
/** Positive means this member is owed money; no transfer or settlement is performed. */
export function balances(expenses: Expense[]): Record<MemberId, number> {
  const totals: Record<MemberId, number> = { nate: 0, alex: 0, sam: 0 };
  for (const expense of expenses.filter(item => item.paid && !item.settled)) {
    totals[expense.payer] += expense.cents;
    for (const share of splitExpense(expense)) totals[share.member] -= share.cents;
  }
  return totals;
}
export function canReadNote(note: HomeNote, actor: MemberId) {
  return note.author === actor || note.access === 'home' || (note.access === 'selected' && note.readers.includes(actor));
}
export function normalizedItem(title: string) { return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en'); }
const isMember = (value: string): value is MemberId => MEMBERS.some(member => member.id === value);
const isRepeat = (value: string): value is Repeat => ['once', 'daily', 'weekly', 'monthly'].includes(value);

/** The form boundary constructs explicit typed records; no arbitrary input is spread into state. */
export function draftAction(request: EditorRequest, values: Draft, state: HouseholdState): { action: Action } | { error: string } {
  const title = (values.title ?? '').trim();
  if (!title || title.length > 100) return { error: 'Enter a name between 1 and 100 characters.' };
  const member = values.member ?? state.actor;
  if (!isMember(member)) return { error: 'Choose a household member.' };
  const repeat = values.repeat ?? 'once';
  if (!isRepeat(repeat)) return { error: 'Choose a supported repeat interval.' };
  const date = values.date ?? DEMO_TODAY;
  if (!['shopping', 'note'].includes(request.kind) && !isDate(date)) return { error: 'Enter a valid date as YYYY-MM-DD.' };
  const id = request.id;
  switch (request.kind) {
    case 'task': return { action: { type: 'save-task', record: { id, title, category: values.category || 'Cleaning', due: date, repeat, assignee: member, rotate: values.rotate === 'yes' } } };
    case 'shopping': return { action: { type: 'add-shopping', record: { id, title, quantity: (values.quantity || '1').trim(), category: values.category || 'Other', addedBy: state.actor } } };
    case 'event': {
      const endDate = values.endDate || date;
      if (!isDate(endDate) || endDate < date) return { error: 'The end date must be on or after the start date.' };
      if (values.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) return { error: 'Use a 24-hour time, for example 18:30, or leave it blank.' };
      return { action: { type: 'save-event', record: { id, title, date, endDate, time: values.time || '', category: values.category || 'Visit', member, details: values.details || '' } } };
    }
    case 'note': {
      const existing = state.notes.find(note => note.id === id);
      if (existing && existing.author !== state.actor) return { error: 'Only the author can edit this note in the preview.' };
      const access = values.access;
      if (access !== 'home' && access !== 'selected' && access !== 'private') return { error: 'Choose who can read this note.' };
      const readers = MEMBERS.filter(item => (values.readers || '').split(',').includes(item.id)).map(item => item.id);
      if (access === 'selected' && !readers.some(reader => reader !== state.actor)) return { error: 'Select at least one other reader, or choose Only me.' };
      if (!values.body?.trim()) return { error: 'Write something for this note.' };
      return { action: { type: 'save-note', record: { id, title, body: values.body.trim(), author: existing?.author ?? state.actor, access, readers: access === 'selected' ? readers : [], pinned: existing?.pinned ?? false } } };
    }
    case 'package': return { action: { type: 'save-package', record: { id, title, recipient: member, date, location: values.details || 'Front door', status: state.packages.find(parcel => parcel.id === id)?.status ?? 'expected', collectedBy: state.packages.find(parcel => parcel.id === id)?.collectedBy } } };
    case 'asset': {
      if (values.warranty && !isDate(values.warranty)) return { error: 'Use YYYY-MM-DD for the warranty date or leave it blank.' };
      return { action: { type: 'save-asset', record: { id, title, room: values.room || 'Home', due: date, interval: repeat, warranty: values.warranty || '', details: values.details || '', history: state.assets.find(asset => asset.id === id)?.history ?? [] } } };
    }
    case 'expense': {
      const cents = parseMoney(values.amount ?? '');
      if (cents === null) return { error: 'Enter a positive euro amount with at most two decimal places.' };
      const participants = MEMBERS.filter(item => (values.participants || '').split(',').includes(item.id)).map(item => item.id);
      if (!participants.length) return { error: 'Choose at least one person to split with.' };
      return { action: { type: 'save-expense', record: { id, title, cents, payer: member, participants, date, repeat, paid: values.paid === 'yes', settled: false } } };
    }
    case 'meal': return { action: { type: 'save-meal', record: { id, title, date, cook: member, servings: values.quantity || '3', ingredients: [...new Set((values.ingredients || '').split('\n').map(value => value.trim()).filter(Boolean))], cooked: false } } };
    case 'pantry': return { action: { type: 'save-pantry', record: { id, title, quantity: values.quantity || '1', expires: date, used: false } } };
  }
}
