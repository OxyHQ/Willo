export type DeviceKey = 'light' | 'pantry' | 'living-lamp' | 'office-lamp' | 'tv' | 'plug' | 'blinds' | 'office-blinds' | 'vacuum';
export type Routine = { id: string; title: string; description: string; icon: 'light' | 'kettle' | 'lock' | 'speaker' | 'sparkle' };
export type HomeState = {
  locked: boolean; temperature: number; movieMode: boolean;
  devices: Record<DeviceKey, boolean>; brightness: Record<string, number>;
  routines: Routine[]; dismissedUpcoming: string[]; kitchenSilenced: boolean;
};
export const initialHomeState: HomeState = {
  locked: true, temperature: 68, movieMode: false,
  devices: { light: true, pantry: true, 'living-lamp': true, 'office-lamp': true, tv: true, plug: true, blinds: false, 'office-blinds': false, vacuum: false },
  brightness: { light: 50, pantry: 50, 'living-lamp': 50, 'office-lamp': 50, tv: 50 },
  routines: [], dismissedUpcoming: [], kitchenSilenced: true,
};
export type HomeAction =
  | { type: 'TOGGLE_LOCK' }
  | { type: 'TOGGLE_DEVICE'; id: DeviceKey }
  | { type: 'SET_BRIGHTNESS'; id: DeviceKey; value: number }
  | { type: 'TEMPERATURE'; delta: number }
  | { type: 'TOGGLE_MOVIE' }
  | { type: 'ADD_ROUTINE'; routine: Routine }
  | { type: 'DISMISS_UPCOMING'; id: string }
  | { type: 'TOGGLE_SILENCE' }
  | { type: 'RESET' };
export function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'TOGGLE_LOCK': return { ...state, locked: !state.locked };
    case 'TOGGLE_DEVICE': return { ...state, devices: { ...state.devices, [action.id]: !state.devices[action.id] } };
    case 'SET_BRIGHTNESS': {
      if (!Number.isFinite(action.value)) return state;
      const value = Math.min(100, Math.max(0, Math.round(action.value)));
      return { ...state, brightness: { ...state.brightness, [action.id]: value }, devices: { ...state.devices, [action.id]: value > 0 } };
    }
    case 'TEMPERATURE': return Number.isFinite(action.delta) ? { ...state, temperature: Math.min(90, Math.max(50, state.temperature + action.delta)) } : state;
    case 'TOGGLE_MOVIE': return { ...state, movieMode: !state.movieMode };
    case 'ADD_ROUTINE': return action.routine.title.trim() && !state.routines.some(r => r.id === action.routine.id) ? { ...state, routines: [...state.routines, action.routine] } : state;
    case 'DISMISS_UPCOMING': return { ...state, dismissedUpcoming: [...new Set([...state.dismissedUpcoming, action.id])] };
    case 'TOGGLE_SILENCE': return { ...state, kitchenSilenced: !state.kitchenSilenced };
    case 'RESET': return initialHomeState;
    default: return state;
  }
}
