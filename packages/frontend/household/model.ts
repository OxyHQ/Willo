/** UI-only household records. No server permissions, payments or synchronisation. */
export const DEMO_TODAY = '2026-09-14';
export const MEMBERS = [
  { id: 'nate', name: 'Nate', initial: 'N', color: 'bg-home-blue text-home-on-blue' },
  { id: 'alex', name: 'Alex', initial: 'A', color: 'bg-home-peach text-home-on-peach' },
  { id: 'sam', name: 'Sam', initial: 'S', color: 'bg-home-green text-home-on-green' },
] as const;
export type MemberId = typeof MEMBERS[number]['id'];
export type Repeat = 'once' | 'daily' | 'weekly' | 'monthly';
export const SECTIONS = [
  { id: 'tasks', title: 'Tasks & routines', short: 'Tasks', description: 'A fair share of the everyday.', tone: 'blue' },
  { id: 'shopping', title: 'Shopping', short: 'Shopping', description: 'One list. Whoever is at the shop.', tone: 'yellow' },
  { id: 'calendar', title: 'Home calendar', short: 'Calendar', description: 'Make room for what is coming.', tone: 'sky' },
  { id: 'notes', title: 'Home notes', short: 'Notes', description: 'The little things worth remembering.', tone: 'peach' },
  { id: 'packages', title: 'Packages', short: 'Packages', description: 'On the way, at the door, taken care of.', tone: 'green' },
  { id: 'maintenance', title: 'Maintenance', short: 'Maintenance', description: 'Keep your home in good shape.', tone: 'blue' },
  { id: 'expenses', title: 'Bills & shared expenses', short: 'Expenses', description: 'Keep it simple. Keep it fair.', tone: 'yellow' },
  { id: 'meals', title: 'Meals', short: 'Meals', description: 'What is for dinner? Start here.', tone: 'peach' },
] as const;
export type HouseholdSection = typeof SECTIONS[number]['id'];
export type HouseholdTone = typeof SECTIONS[number]['tone'];
export function isHouseholdSection(value: unknown): value is HouseholdSection {
  return SECTIONS.some(section => section.id === value);
}
export function memberName(id: MemberId) { return MEMBERS.find(member => member.id === id)?.name ?? 'Member'; }
export type Completion = { date: string; by: MemberId; previousDue: string; previousAssignee: MemberId };
export type Task = { id: string; title: string; category: string; due: string; repeat: Repeat; assignee: MemberId; rotate: boolean; completion?: Completion };
export type ShoppingItem = { id: string; title: string; quantity: string; category: string; addedBy: MemberId; checkedBy?: MemberId };
export type CalendarEvent = { id: string; title: string; date: string; endDate: string; time: string; category: string; member: MemberId; details: string };
export type HomeNote = { id: string; title: string; body: string; author: MemberId; access: 'home' | 'selected' | 'private'; readers: MemberId[]; pinned: boolean };
export type Parcel = { id: string; title: string; recipient: MemberId; date: string; location: string; status: 'expected' | 'delivered' | 'collected'; collectedBy?: MemberId };
export type Asset = { id: string; title: string; room: string; due: string; interval: Repeat; warranty: string; details: string; history: { date: string; by: MemberId }[] };
export type Expense = { id: string; title: string; cents: number; payer: MemberId; participants: MemberId[]; date: string; repeat: Repeat; paid: boolean; settled: boolean };
export type Meal = { id: string; title: string; date: string; cook: MemberId; servings: string; ingredients: string[]; cooked: boolean };
export type PantryItem = { id: string; title: string; quantity: string; expires: string; used: boolean };
export type EditorKind = 'task' | 'shopping' | 'event' | 'note' | 'package' | 'asset' | 'expense' | 'meal' | 'pantry';
export type Draft = Record<string, string>;
export type EditorRequest = { kind: EditorKind; id: string; values: Draft; isNew: boolean };
export type HouseholdState = {
  actor: MemberId; tasks: Task[]; shopping: ShoppingItem[]; events: CalendarEvent[];
  notes: HomeNote[]; packages: Parcel[]; assets: Asset[]; expenses: Expense[]; meals: Meal[]; pantry: PantryItem[];
};
export type Action =
  | { type: 'actor'; id: MemberId }
  | { type: 'save-task'; record: Task } | { type: 'complete-task'; id: string }
  | { type: 'add-shopping'; record: ShoppingItem } | { type: 'toggle-shopping'; id: string } | { type: 'clear-shopping' }
  | { type: 'save-event'; record: CalendarEvent }
  | { type: 'save-note'; record: HomeNote } | { type: 'pin-note'; id: string }
  | { type: 'save-package'; record: Parcel } | { type: 'advance-package'; id: string } | { type: 'undo-collection'; id: string }
  | { type: 'save-asset'; record: Asset } | { type: 'service-asset'; id: string }
  | { type: 'save-expense'; record: Expense } | { type: 'pay-expense'; id: string } | { type: 'settle-expense'; id: string }
  | { type: 'save-meal'; record: Meal } | { type: 'cook-meal'; id: string } | { type: 'shop-meal'; id: string }
  | { type: 'save-pantry'; record: PantryItem } | { type: 'use-pantry'; id: string };
