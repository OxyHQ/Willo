import { DEMO_TODAY, type HouseholdState } from './model';
/** Invented, fixed-date examples. Never substitute these for an authenticated household. */
export function createHouseholdState(): HouseholdState {
  return {
    actor: 'nate',
    tasks: [
      { id: 'task-clean', title: 'Freshen up the kitchen', category: 'Cleaning', due: DEMO_TODAY, repeat: 'daily', assignee: 'nate', rotate: true },
      { id: 'task-trash', title: 'Take the recycling out', category: 'Waste', due: DEMO_TODAY, repeat: 'weekly', assignee: 'alex', rotate: true },
      { id: 'task-cat', title: 'Feed Miso', category: 'Pet', due: DEMO_TODAY, repeat: 'daily', assignee: 'sam', rotate: false },
      { id: 'task-plants', title: 'Water the living room plants', category: 'Plants', due: DEMO_TODAY, repeat: 'weekly', assignee: 'nate', rotate: true },
      { id: 'task-laundry', title: 'Wash towels & bed linen', category: 'Laundry', due: '2026-09-16', repeat: 'weekly', assignee: 'alex', rotate: true },
    ],
    shopping: [
      { id: 'shop-milk', title: 'Milk', quantity: '2 cartons', category: 'Dairy', addedBy: 'alex' },
      { id: 'shop-tomatoes', title: 'Cherry tomatoes', quantity: '500 g', category: 'Produce', addedBy: 'nate' },
      { id: 'shop-eggs', title: 'Eggs', quantity: '6', category: 'Dairy', addedBy: 'sam' },
      { id: 'shop-soap', title: 'Laundry detergent', quantity: '1 bottle', category: 'Household', addedBy: 'alex' },
      { id: 'shop-bread', title: 'Sourdough bread', quantity: '1 loaf', category: 'Bakery', addedBy: 'nate', checkedBy: 'sam' },
    ],
    events: [
      { id: 'event-visit', title: 'Friends for dinner', date: DEMO_TODAY, endDate: DEMO_TODAY, time: '19:30', category: 'Visit', member: 'nate', details: 'Four people. Set two extra places.' },
      { id: 'event-repair', title: 'Boiler technician', date: '2026-09-16', endDate: '2026-09-16', time: '10:00', category: 'Repair', member: 'alex', details: 'Someone needs to be home between 10 and 12.' },
      { id: 'event-delivery', title: 'Grocery delivery', date: '2026-09-17', endDate: '2026-09-17', time: '18:00', category: 'Delivery', member: 'sam', details: 'Leave the reusable bags by the door.' },
      { id: 'event-birthday', title: 'Family birthday dinner', date: '2026-09-20', endDate: '2026-09-20', time: '18:30', category: 'Birthday', member: 'nate', details: 'Remember the cake.' },
      { id: 'event-away', title: 'Away for the weekend', date: '2026-09-25', endDate: '2026-09-27', time: '', category: 'Holiday', member: 'alex', details: 'Please keep an eye on the plants.' },
    ],
    notes: [
      { id: 'note-cat', title: 'Looking after Miso', body: 'Breakfast at 8, dinner at 7. Fresh water every morning. Her favourite toy is in the basket by the sofa.', author: 'sam', access: 'home', readers: [], pinned: true },
      { id: 'note-wifi', title: 'Guest WiFi', body: 'Network: Willo Guest (example)\nPassword: example-only-not-a-real-password', author: 'nate', access: 'home', readers: [], pinned: true },
      { id: 'note-garage', title: 'Garage access', body: 'Demo note only. Ask the host for the real access instructions. Never store real codes in this preview.', author: 'nate', access: 'selected', readers: ['alex'], pinned: false },
      { id: 'note-private', title: 'A birthday surprise', body: 'A handwritten card and a homemade cake. This is fictional demo content.', author: 'alex', access: 'private', readers: [], pinned: false },
    ],
    packages: [
      { id: 'parcel-book', title: 'Books for the weekend', recipient: 'nate', date: DEMO_TODAY, location: 'Front door', status: 'delivered' },
      { id: 'parcel-filter', title: 'Replacement air filters', recipient: 'alex', date: '2026-09-16', location: 'Parcel locker', status: 'expected' },
      { id: 'parcel-cat', title: 'Miso’s food', recipient: 'sam', date: '2026-09-13', location: 'Kitchen counter', status: 'collected', collectedBy: 'nate' },
    ],
    assets: [
      { id: 'asset-filter', title: 'Air purifier filter', room: 'Living room', due: DEMO_TODAY, interval: 'monthly', warranty: '2027-02-20', details: 'Model: Air 200 (example). Replace the filter, then reset the indicator.', history: [{ date: '2026-08-14', by: 'sam' }] },
      { id: 'asset-boiler', title: 'Boiler inspection', room: 'Utility room', due: '2026-09-16', interval: 'once', warranty: '2026-12-31', details: 'Professional service visit. Keep the service receipt with the appliance documents.', history: [] },
      { id: 'asset-bulb', title: 'Hallway light bulb', room: 'Hallway', due: '2026-09-18', interval: 'once', warranty: '', details: 'Warm white, E27 fitting. Check the appliance instructions before replacing.', history: [] },
      { id: 'asset-washer', title: 'Washing machine clean', room: 'Laundry', due: '2026-09-21', interval: 'monthly', warranty: '2026-08-01', details: 'Run the manufacturer’s maintenance cycle. Warranty date is an example.', history: [] },
    ],
    expenses: [
      { id: 'expense-internet', title: 'Internet', cents: 3200, payer: 'nate', participants: ['nate', 'alex', 'sam'], date: DEMO_TODAY, repeat: 'monthly', paid: true, settled: false },
      { id: 'expense-groceries', title: 'Weekend groceries', cents: 6450, payer: 'alex', participants: ['nate', 'alex', 'sam'], date: '2026-09-13', repeat: 'once', paid: true, settled: false },
      { id: 'expense-water', title: 'Water', cents: 2400, payer: 'sam', participants: ['nate', 'alex', 'sam'], date: '2026-09-20', repeat: 'monthly', paid: false, settled: false },
    ],
    meals: [
      { id: 'meal-pasta', title: 'Roasted tomato pasta', date: DEMO_TODAY, cook: 'alex', servings: '3', ingredients: ['Cherry tomatoes', 'Pasta', 'Basil', 'Parmesan'], cooked: false },
      { id: 'meal-curry', title: 'Chickpea & spinach curry', date: '2026-09-15', cook: 'nate', servings: '3', ingredients: ['Chickpeas', 'Spinach', 'Rice'], cooked: false },
      { id: 'meal-leftovers', title: 'Leftovers night', date: '2026-09-16', cook: 'sam', servings: '3', ingredients: [], cooked: false },
    ],
    pantry: [
      { id: 'pantry-spinach', title: 'Baby spinach', quantity: '1 bag', expires: '2026-09-15', used: false },
      { id: 'pantry-soup', title: 'Homemade soup', quantity: '2 portions', expires: '2026-09-16', used: false },
      { id: 'pantry-yogurt', title: 'Greek yogurt', quantity: '1 pot', expires: '2026-09-18', used: false },
    ],
  };
}
