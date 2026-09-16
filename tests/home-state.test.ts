import test from 'node:test';
import assert from 'node:assert/strict';
import { homeReducer, initialHomeState } from '../packages/frontend/state/home-reducer.ts';
test('upcoming cards can be dismissed only once', () => {
  const action = { type: 'DISMISS_UPCOMING', id: 'kettle' } as const;
  const state = homeReducer(homeReducer(initialHomeState, action), action);
  assert.deepEqual(state.dismissedUpcoming, ['kettle']);
});
test('a saved automation is appended and duplicate ids are ignored', () => {
  const action = { type: 'ADD_ROUTINE', routine: { id: 'one', title: 'Lights off', description: 'At sunrise', icon: 'light' } } as const;
  const state = homeReducer(initialHomeState, action);
  assert.equal(state.routines.length, 1);
  assert.equal(homeReducer(state, action).routines.length, 1);
});
test('empty routine titles are rejected', () => {
  const action = { type: 'ADD_ROUTINE', routine: { id: 'empty', title: '  ', description: '', icon: 'light' } } as const;
  assert.equal(homeReducer(initialHomeState, action).routines.length, 0);
});
// Devices themselves live in a provider now (`providers/demo-home.ts`); what
// is left here is the demo's own scene state.
test('movie mode, demo silence and reset work', () => {
  let state = homeReducer(initialHomeState, { type: 'TOGGLE_MOVIE' });
  state = homeReducer(state, { type: 'TOGGLE_SILENCE' });
  assert.equal(state.movieMode, true);
  assert.equal(state.kitchenSilenced, false);
  assert.deepEqual(homeReducer(state, { type: 'RESET' }), initialHomeState);
});
