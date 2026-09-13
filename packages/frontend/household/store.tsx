import React, { createContext, useContext, useReducer, useRef, useState } from 'react';
import { createHouseholdState } from './fixtures';
import { householdReducer } from './reducer';
import { DEMO_TODAY, type Action, type Draft, type EditorKind, type EditorRequest, type HouseholdState } from './model';

type HouseholdContextValue = {
  state: HouseholdState; dispatch: React.Dispatch<Action>; editor: EditorRequest | null;
  openEditor: (kind: EditorKind, values?: Draft, id?: string) => void; closeEditor: () => void;
};
const HouseholdContext = createContext<HouseholdContextValue | null>(null);
export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(householdReducer, undefined, createHouseholdState);
  const [editor, setEditor] = useState<EditorRequest | null>(null);
  const sequence = useRef(0);
  function openEditor(kind: EditorKind, values: Draft = {}, id?: string) {
    sequence.current += 1;
    setEditor({ kind, id: id ?? `household-${kind}-${Date.now()}-${sequence.current}`, isNew: !id, values: {
      title: '', date: DEMO_TODAY, repeat: 'once', member: state.actor, access: 'home', participants: 'nate,alex,sam', paid: 'yes', rotate: 'no', ...values,
    } });
  }
  return <HouseholdContext.Provider value={{ state, dispatch, editor, openEditor, closeEditor: () => setEditor(null) }}>{children}</HouseholdContext.Provider>;
}
export function useHousehold() {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error('Household screens require HouseholdProvider.');
  return value;
}
