import React, { createContext, useContext } from "react";
import { useUser } from "@clerk/clerk-expo";

type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!isSignedIn,
        loading: !isLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
