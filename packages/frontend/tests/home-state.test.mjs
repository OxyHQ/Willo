import test from 'node:test';
import assert from 'node:assert/strict';
import { homeReducer, initialHomeState } from '../state/home-reducer.ts';
test('lock toggles without mutating the initial state', () => {
    const next = homeReducer(initialHomeState, { type: 'TOGGLE_LOCK' });
    assert.equal(next.locked, false);
    assert.equal(initialHomeState.locked, true);
});
test('temperature is clamped to 50–90', () => {
    assert.equal(homeReducer(initialHomeState, { type: 'TEMPERATURE', delta: 999 }).temperature, 90);
    assert.equal(homeReducer(initialHomeState, { type: 'TEMPERATURE', delta: -999 }).temperature, 50);
    assert.equal(homeReducer(initialHomeState, { type: 'TEMPERATURE', delta: NaN }).temperature, 68);
});
test('brightness is clamped and zero switches a device off', () => {
    const state = homeReducer(initialHomeState, { type: 'SET_BRIGHTNESS', id: 'light', value: -20 });
    assert.equal(state.brightness.light, 0);
    assert.equal(state.devices.light, false);
    const next = homeReducer(state, { type: 'SET_BRIGHTNESS', id: 'light', value: 150 });
    assert.equal(next.brightness.light, 100);
    assert.equal(next.devices.light, true);
});
test('non-finite brightness values are ignored', () => {
    assert.equal(homeReducer(initialHomeState, { type: 'SET_BRIGHTNESS', id: 'light', value: NaN }), initialHomeState);
});
test('upcoming cards can be dismissed only once', () => {
    const action = { type: 'DISMISS_UPCOMING', id: 'kettle' };
    const state = homeReducer(homeReducer(initialHomeState, action), action);
    assert.deepEqual(state.dismissedUpcoming, ['kettle']);
});
test('a saved automation is appended and duplicate ids are ignored', () => {
    const action = { type: 'ADD_ROUTINE', routine: { id: 'one', title: 'Lights off', description: 'At sunrise', icon: 'light' } };
    const state = homeReducer(initialHomeState, action);
    assert.equal(state.routines.length, 1);
    assert.equal(homeReducer(state, action).routines.length, 1);
});
test('empty routine titles are rejected', () => {
    const action = { type: 'ADD_ROUTINE', routine: { id: 'empty', title: '  ', description: '', icon: 'light' } };
    assert.equal(homeReducer(initialHomeState, action).routines.length, 0);
});
test('movie mode, demo silence, device state and reset work', () => {
    let state = homeReducer(initialHomeState, { type: 'TOGGLE_MOVIE' });
    state = homeReducer(state, { type: 'TOGGLE_SILENCE' });
    state = homeReducer(state, { type: 'TOGGLE_DEVICE', id: 'vacuum' });
    assert.equal(state.movieMode, true);
    assert.equal(state.kitchenSilenced, false);
    assert.equal(state.devices.vacuum, true);
    assert.deepEqual(homeReducer(state, { type: 'RESET' }), initialHomeState);
});
