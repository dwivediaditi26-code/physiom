import { createContext, useContext } from "react";

// Is the PhysioFeed tab the one on screen right now?
//
// AppFull.jsx keeps PhysioFeed mounted (just display:none) once it has been
// opened, so anything inside it that reaches OUT of its own box -- the section
// row it draws into the app's top bar -- keeps doing so while the student is on
// Home or Clinical. Defaults to true so PhysioFeed shown anywhere else (tests,
// other shells) behaves as before.
const TabActiveContext = createContext(true);

export const TabActiveProvider = TabActiveContext.Provider;
export const useTabActive = () => useContext(TabActiveContext);
