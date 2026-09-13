import type { Device, IconName, Routine, ScreenId } from './types';

// Reference-only fixtures. These are not connected devices, alerts or recordings.
export const ROOM_IMAGE = require('../../assets/ui-preview/living-room.webp');
export const GARDEN_IMAGE = require('../../assets/ui-preview/garden.webp');

export const PREVIEW_SCREENS: { id: ScreenId; title: string; description: string; icon: IconName }[] = [
  { id: 'home', title: 'Home', description: 'Current layout · camera, favorites and thermostat', icon: 'home-outline' },
  { id: 'activity', title: 'Activity', description: 'Home brief, filters and camera events', icon: 'reorder-two-outline' },
  { id: 'automations', title: 'Automations', description: 'Upcoming cards and your automations', icon: 'sparkles-outline' },
  { id: 'favorites', title: 'Favorites', description: 'Classic layout · categories and shortcuts', icon: 'heart-outline' },
  { id: 'devices', title: 'Devices', description: 'Room-by-room device grid', icon: 'apps-outline' },
  { id: 'routines', title: 'Routines', description: 'Household and personal routines', icon: 'flash-outline' },
  { id: 'activity-classic', title: 'Classic activity', description: 'Compact event timeline', icon: 'time-outline' },
  { id: 'settings', title: 'Settings', description: 'Home, devices, services and features', icon: 'settings-outline' },
  { id: 'ask', title: 'Ask your home', description: 'Sample conversation and event results', icon: 'chatbubble-outline' },
  { id: 'emergency', title: 'Smoke alert', description: 'Sample emergency screen, not an active alert', icon: 'warning-outline' },
  { id: 'create-automation', title: 'Automation editor', description: 'Natural-language input and suggestions', icon: 'create-outline' },
];

export const ROOMS: { name: string; devices: Device[] }[] = [
  { name: 'Front room', devices: [
    { id: 'tv', name: 'TV', status: 'On · 50%', inactiveStatus: 'Off', icon: 'tv-outline', tone: 'blue', isActive: true },
    { id: 'thermostat', name: 'Thermostat', status: 'Indoor 70°', inactiveStatus: 'Off', icon: 'thermometer-outline', tone: 'peach', isActive: true },
  ] },
  { name: 'Living room', devices: [
    { id: 'living-lamp', name: 'Lamp', status: 'On · 50%', inactiveStatus: 'Off', icon: 'bulb', tone: 'yellow', isActive: true, brightness: 50 },
    { id: 'camera', name: 'Camera', status: 'On', inactiveStatus: 'Off', icon: 'videocam', tone: 'blue', isActive: true },
    { id: 'living-blinds', name: 'Blinds', status: 'Closed', inactiveStatus: 'Open', icon: 'albums-outline', tone: 'blue', isActive: true },
    { id: 'vacuum', name: 'Vacuum', status: 'Running', inactiveStatus: 'Paused', icon: 'disc-outline', tone: 'blue', isActive: false },
  ] },
  { name: 'Office', devices: [
    { id: 'plug', name: 'Smart plug', status: 'On', inactiveStatus: 'Off', icon: 'power-outline', tone: 'blue', isActive: true },
    { id: 'office-lamp', name: 'Lamp', status: 'On · 50%', inactiveStatus: 'Off', icon: 'bulb', tone: 'yellow', isActive: true, brightness: 50 },
    { id: 'office-blinds', name: 'Blinds', status: 'Closed', inactiveStatus: 'Open', icon: 'albums-outline', tone: 'blue', isActive: true },
  ] },
];

export const AUTOMATIONS: Routine[] = [
  { id: 'wake', title: 'Wake up', subtitle: 'At sunrise, turn on bedroom lights and open blinds', icon: 'bulb-outline' },
  { id: 'kettle', title: 'Morning kettle', subtitle: 'At 10:00 AM today, turn on the kettle', icon: 'cafe-outline' },
  { id: 'security', title: 'Nighttime security', subtitle: 'At 7:30 PM, lock the doors and turn on the lights', icon: 'lock-closed-outline' },
  { id: 'music', title: 'Friday jam', subtitle: 'At 8:00 PM, on Fridays, play “Friday jam”', icon: 'musical-notes-outline' },
];
export const HOUSEHOLD_ROUTINES: Routine[] = [
  { id: 'garage', title: 'Garage motion light', subtitle: '1 starter · 1 action', icon: 'settings-outline' },
  { id: 'movie', title: 'Movie mode', subtitle: '1 starter · 3 actions', icon: 'bulb-outline' },
  { id: 'party', title: 'Party time', subtitle: '1 starter · 4 actions', icon: 'musical-notes-outline' },
  { id: 'home', title: 'Home', subtitle: 'When someone comes home', icon: 'home' },
  { id: 'away', title: 'Away', subtitle: 'When everyone is away', icon: 'home-outline' },
];
export const EVENTS = [
  { id: 'person-1', title: 'Person', time: '7:15 PM', camera: 'Backyard camera', category: 'person', image: 'garden' },
  { id: 'animal-1', title: 'Activity or animal seen', time: '5:00 PM', camera: 'Backyard camera', category: 'animal', image: 'garden' },
  { id: 'person-2', title: 'Person', time: '3:00 PM', camera: 'Backyard camera', category: 'person', image: 'garden' },
  { id: 'home', title: 'Switched to Home', time: '2:30 PM', camera: '', category: 'home', image: null },
  { id: 'animal-2', title: 'Activity or animal seen', time: '11:00 AM', camera: 'Living room camera', category: 'animal', image: 'room' },
  { id: 'away', title: 'Switched to Away', time: '8:00 AM', camera: '', category: 'home', image: null },
] as const;
export const BRIEF_PARAGRAPHS = [
  'The day began with frequent activity from the toy dog in the Den. Throughout the morning, various cats were quite active, spotted around the backyard, jumping on the bird bath and stone wall. Julie was seen at the back door in the early morning and later watering plants. Around mid-morning, Dan arrived, opening and closing the gate.',
  'In the afternoon, several cats were again seen in the backyard, even eating food from the stone wall, with one person observed scattering the food. Later, a person was seen interacting with the toy dog in the Den. Interestingly, a person in an orange dinosaur costume made an appearance near the Playhouse Doorbell and in the backyard, while a child exited an inflatable Halloween decoration. As the day ended, more cats were observed in the backyard, and Josh was seen at the Playhouse Doorbell.',
];
