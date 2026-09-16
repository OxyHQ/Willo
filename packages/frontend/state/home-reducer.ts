export type Routine = { id: string; title: string; description: string; icon: 'light' | 'kettle' | 'lock' | 'speaker' | 'sparkle' };
/**
 * What's left of the demo's own state now that its devices are a provider
 * (`providers/demo-home.ts`): the things that aren't devices at all — a demo
 * scene, the automations someone drafted, the cards they dismissed, and the
 * smoke-alert screen's silenced flag.
 */
export type HomeState = {
  movieMode: boolean;
  routines: Routine[]; dismissedUpcoming: string[]; kitchenSilenced: boolean;
};
export const initialHomeState: HomeState = {
  movieMode: false,
  routines: [], dismissedUpcoming: [], kitchenSilenced: true,
};
export type HomeAction =
  | { type: 'TOGGLE_MOVIE' }
  | { type: 'ADD_ROUTINE'; routine: Routine }
  | { type: 'DISMISS_UPCOMING'; id: string }
  | { type: 'TOGGLE_SILENCE' }
  | { type: 'RESET' };
export function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'TOGGLE_MOVIE': return { ...state, movieMode: !state.movieMode };
    case 'ADD_ROUTINE': return action.routine.title.trim() && !state.routines.some(r => r.id === action.routine.id) ? { ...state, routines: [...state.routines, action.routine] } : state;
    case 'DISMISS_UPCOMING': return { ...state, dismissedUpcoming: [...new Set([...state.dismissedUpcoming, action.id])] };
    case 'TOGGLE_SILENCE': return { ...state, kitchenSilenced: !state.kitchenSilenced };
    case 'RESET': return initialHomeState;
    default: return state;
  }
}
