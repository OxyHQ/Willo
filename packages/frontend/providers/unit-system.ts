/** Mirrors the backend's `UNIT_SYSTEMS` (`schema.ts`), the Home's shared display units. */
export type UnitSystem = 'metric' | 'imperial';

/** The only regions that still use Fahrenheit and imperial units day to day. */
const IMPERIAL_REGIONS = ['US', 'LR', 'MM'];

/**
 * The unit system a new Home starts with, from a BCP 47 locale such as
 * `en-US` or `es-ES`. A locale with no region (`en`) says nothing about where
 * the person lives, so it gets metric like everywhere else.
 */
export function unitSystemForLocale(locale: string): UnitSystem {
  const region = locale.split('-').slice(1).find(part => /^[A-Za-z]{2}$/.test(part))?.toUpperCase();
  return region !== undefined && IMPERIAL_REGIONS.includes(region) ? 'imperial' : 'metric';
}

export type TemperatureUnit = '°C' | '°F';

/**
 * A temperature reported in `fromUnit`, converted to the Home's unit system:
 * one decimal in Celsius (a half degree is a real difference there), whole
 * degrees in Fahrenheit. Returns the number and its unit separately so a
 * large display (the thermostat) can style or drop the unit on its own.
 */
export function convertTemperature(value: number, fromUnit: TemperatureUnit, system: UnitSystem): { value: number; unit: TemperatureUnit } {
  const unit: TemperatureUnit = system === 'imperial' ? '°F' : '°C';
  // A reading already in the Home's unit is shown exactly as reported — only a
  // converted value is rounded, so a sensor's own precision survives.
  if (fromUnit === unit) return { value, unit };
  const converted = unit === '°F' ? value * 9 / 5 + 32 : (value - 32) * 5 / 9;
  return { value: unit === '°F' ? Math.round(converted) : Math.round(converted * 10) / 10, unit };
}

export function formatTemperature(value: number, fromUnit: TemperatureUnit, system: UnitSystem): string {
  const temperature = convertTemperature(value, fromUnit, system);
  return `${temperature.value}${temperature.unit}`;
}
