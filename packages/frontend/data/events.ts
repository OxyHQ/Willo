import { assets } from './assets';
export type HomeEvent = { id: string; title: string; time: string; location: string; category: 'person' | 'animal' | 'security'; day: 'Today' | 'Yesterday'; image?: number; garden?: boolean };
export const timelineEvents: HomeEvent[] = [
  { id: 'person-715', title: 'Person', time: '7:15 PM', location: 'Backyard camera', category: 'person', day: 'Today', image: assets.gardenEvent, garden: true },
  { id: 'animal-500', title: 'Activity or animal seen', time: '5:00 PM', location: 'Backyard camera', category: 'animal', day: 'Today', image: assets.gardenEvent2, garden: true },
  { id: 'person-300', title: 'Person', time: '3:00 PM', location: 'Backyard camera', category: 'person', day: 'Today', image: assets.gardenEvent3, garden: true },
  { id: 'home-230', title: 'Switched to Home', time: '2:30 PM', location: '', category: 'security', day: 'Today' },
  { id: 'living-1100', title: 'Activity or animal seen', time: '11:00 AM', location: 'Living room camera', category: 'animal', day: 'Today', image: assets.livingRoom },
  { id: 'away-900', title: 'Switched to Away', time: '9:00 AM', location: '', category: 'security', day: 'Today' },
  { id: 'person-yesterday', title: 'Person', time: '6:40 PM', location: 'Backyard camera', category: 'person', day: 'Yesterday', image: assets.gardenEvent, garden: true },
];
export const activityEvents: HomeEvent[] = [
  { id: 'delivery', title: 'Person delivers 4 boxes', time: '2:42 PM', location: 'Front door', category: 'person', day: 'Today', image: assets.delivery },
  { id: 'rabbits', title: 'Rabbits nibble plants', time: '1:17 PM', location: 'Garden Bed', category: 'animal', day: 'Today', image: assets.rabbitPlants, garden: true },
  { id: 'front-door', title: 'Front door locked', time: '12:05 PM', location: 'Front door lock', category: 'security', day: 'Today' },
  { id: 'garden-yesterday', title: 'Activity in the backyard', time: '5:12 PM', location: 'Backyard camera', category: 'animal', day: 'Yesterday', image: assets.gardenEvent2, garden: true },
];
export const briefParagraphs = [
  'The day began with frequent activity from the toy dog in the Den. Throughout the morning, various cats were quite active, spotted around the backyard, jumping on the bird bath and stone wall. Julie was seen at the back door in the early morning and later watering plants. Around mid-morning, Dan arrived, opening and closing the gate.',
  'In the afternoon, several cats were again seen in the backyard, even eating food from the stone wall, with one person observed scattering the food. Later, a person was seen interacting with the toy dog in the Den. Interestingly, a person in an orange dinosaur costume made an appearance near the Playhouse Doorbell and in the backyard, while a child exited an inflatable Halloween decoration.',
  'As the day ended, more cats were observed in the backyard, and Josh was seen at the Playhouse Doorbell.',
];
