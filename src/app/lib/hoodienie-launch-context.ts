import { createContext, useContext } from 'react';

type HoodienieLaunchContextValue = {
  launchActive: boolean;
};

export const HoodienieLaunchContext = createContext<HoodienieLaunchContextValue>({
  launchActive: false,
});

export function useHoodienieLaunchContext() {
  return useContext(HoodienieLaunchContext);
}
