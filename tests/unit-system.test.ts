import test from 'node:test';
import assert from 'node:assert/strict';
import { convertTemperature, formatTemperature, unitSystemForLocale } from '../packages/frontend/providers/unit-system.ts';

test('a device set to a US locale starts its Home in imperial', () => {
  assert.equal(unitSystemForLocale('en-US'), 'imperial');
  assert.equal(unitSystemForLocale('es-US'), 'imperial');
});

test('every other region, and a locale with no region, starts in metric', () => {
  assert.equal(unitSystemForLocale('es-ES'), 'metric');
  assert.equal(unitSystemForLocale('en-GB'), 'metric');
  assert.equal(unitSystemForLocale('zh-Hans-CN'), 'metric');
  assert.equal(unitSystemForLocale('en'), 'metric');
});

test('a Celsius reading shows in whole Fahrenheit degrees for an imperial Home', () => {
  assert.equal(formatTemperature(21.5, '°C', 'imperial'), '71°F');
  assert.equal(formatTemperature(0, '°C', 'imperial'), '32°F');
});

test('a Fahrenheit reading shows in Celsius to one decimal for a metric Home', () => {
  assert.equal(formatTemperature(70, '°F', 'metric'), '21.1°C');
  assert.deepEqual(convertTemperature(212, '°F', 'metric'), { value: 100, unit: '°C' });
});

test('a reading already in the Home’s unit is shown exactly as reported', () => {
  assert.equal(formatTemperature(21.37, '°C', 'metric'), '21.37°C');
  assert.equal(formatTemperature(68, '°F', 'imperial'), '68°F');
});
