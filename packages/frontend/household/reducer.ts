import { DEMO_TODAY, MEMBERS, type Action, type HouseholdState, type ShoppingItem } from './model';
import { nextDue, normalizedItem } from './logic';

function upsert<RecordType extends { id: string }>(records: RecordType[], record: RecordType): RecordType[] {
  return records.some(item => item.id === record.id) ? records.map(item => item.id === record.id ? record : item) : [...records, record];
}
function addShopping(records: ShoppingItem[], record: ShoppingItem): ShoppingItem[] {
  const existing = records.find(item => normalizedItem(item.title) === normalizedItem(record.title));
  if (!existing) return [...records, record];
  if (!existing.checkedBy) return records;
  return records.map(item => item.id === existing.id ? { ...item, quantity: record.quantity, addedBy: record.addedBy, checkedBy: undefined } : item);
}
export function householdReducer(state: HouseholdState, action: Action): HouseholdState {
  switch (action.type) {
    case 'actor': return { ...state, actor: action.id };
    case 'save-task': return { ...state, tasks: upsert(state.tasks, action.record) };
    case 'complete-task': return { ...state, tasks: state.tasks.map(task => {
      if (task.id !== action.id) return task;
      if (task.completion?.date === DEMO_TODAY) return { ...task, due: task.completion.previousDue, assignee: task.completion.previousAssignee, completion: undefined };
      const nextMember = MEMBERS[(MEMBERS.findIndex(member => member.id === task.assignee) + 1) % MEMBERS.length];
      return { ...task, due: nextDue(task.due > DEMO_TODAY ? task.due : DEMO_TODAY, task.repeat), assignee: task.rotate && task.repeat !== 'once' ? nextMember?.id ?? task.assignee : task.assignee,
        completion: { date: DEMO_TODAY, by: state.actor, previousDue: task.due, previousAssignee: task.assignee } };
    }) };
    case 'add-shopping': return { ...state, shopping: addShopping(state.shopping, action.record) };
    case 'toggle-shopping': return { ...state, shopping: state.shopping.map(item => item.id === action.id ? { ...item, checkedBy: item.checkedBy ? undefined : state.actor } : item) };
    case 'clear-shopping': return { ...state, shopping: state.shopping.filter(item => !item.checkedBy) };
    case 'save-event': return { ...state, events: upsert(state.events, action.record) };
    case 'save-note': {
      const existing = state.notes.find(note => note.id === action.record.id);
      if (action.record.author !== state.actor || (existing && existing.author !== state.actor)) return state;
      return { ...state, notes: upsert(state.notes, action.record) };
    }
    case 'pin-note': return { ...state, notes: state.notes.map(note => note.id === action.id && note.author === state.actor ? { ...note, pinned: !note.pinned } : note) };
    case 'save-package': return { ...state, packages: upsert(state.packages, action.record) };
    case 'advance-package': return { ...state, packages: state.packages.map(parcel => parcel.id !== action.id || parcel.status === 'collected' ? parcel : {
      ...parcel, status: parcel.status === 'expected' ? 'delivered' : 'collected', collectedBy: parcel.status === 'delivered' ? state.actor : undefined,
    }) };
    case 'undo-collection': return { ...state, packages: state.packages.map(parcel => parcel.id === action.id && parcel.status === 'collected' ? { ...parcel, status: 'delivered', collectedBy: undefined } : parcel) };
    case 'save-asset': return { ...state, assets: upsert(state.assets, action.record) };
    case 'service-asset': return { ...state, assets: state.assets.map(asset => asset.id !== action.id || asset.history.some(item => item.date === DEMO_TODAY) ? asset : {
      ...asset, due: nextDue(asset.due > DEMO_TODAY ? asset.due : DEMO_TODAY, asset.interval), history: [{ date: DEMO_TODAY, by: state.actor }, ...asset.history],
    }) };
    case 'save-expense': return { ...state, expenses: upsert(state.expenses, action.record) };
    case 'pay-expense': return { ...state, expenses: state.expenses.map(expense => expense.id === action.id && !expense.settled ? { ...expense, paid: !expense.paid } : expense) };
    case 'settle-expense': return { ...state, expenses: state.expenses.map(expense => expense.id === action.id && expense.paid ? { ...expense, settled: !expense.settled } : expense) };
    case 'save-meal': return { ...state, meals: upsert(state.meals, action.record) };
    case 'cook-meal': return { ...state, meals: state.meals.map(meal => meal.id === action.id ? { ...meal, cooked: !meal.cooked } : meal) };
    case 'shop-meal': {
      const meal = state.meals.find(item => item.id === action.id);
      if (!meal) return state;
      let shopping = state.shopping;
      for (const ingredient of meal.ingredients) {
        if (state.pantry.some(item => !item.used && item.expires >= DEMO_TODAY && normalizedItem(item.title) === normalizedItem(ingredient))) continue;
        shopping = addShopping(shopping, { id: `${meal.id}-ingredient-${encodeURIComponent(normalizedItem(ingredient))}`, title: ingredient, quantity: '1', category: 'Meal ingredients', addedBy: state.actor });
      }
      return { ...state, shopping };
    }
    case 'save-pantry': return { ...state, pantry: upsert(state.pantry, action.record) };
    case 'use-pantry': return { ...state, pantry: state.pantry.map(item => item.id === action.id ? { ...item, used: !item.used } : item) };
  }
}
