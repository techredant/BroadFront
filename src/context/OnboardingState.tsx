import React, { createContext, useContext, useState } from "react";

type OnboardingState = {
  hasCompletedName: boolean;
  hasCompletedLocation: boolean;
  onboardingComplete: boolean;
  setHasCompletedName: (v: boolean) => void;
  setHasCompletedLocation: (v: boolean) => void;
  setOnboardingComplete: (v: boolean) => void;
};

const Context = createContext<OnboardingState | null>(null);

export const OnboardingStateProvider = ({ children }: any) => {
  const [hasCompletedName, setHasCompletedName] = useState(false);
  const [hasCompletedLocation, setHasCompletedLocation] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  return (
    <Context.Provider
      value={{
        hasCompletedName,
        hasCompletedLocation,
        onboardingComplete,
        setHasCompletedName,
        setHasCompletedLocation,
        setOnboardingComplete,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useOnboardingState = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useOnboardingState must be used inside provider");
  return ctx;
};
