import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-expo";

type UserOnboarding = {
  firstName: string;
  lastName?: string;
  nickName?: string;
  image: string;
  sessionId: string;
  companyName: string;
  setCompanyName: (name: string) => void;
  setSessionId: (name: string) => void;
  setFirstName: (name: string) => void;
  setLastName: (name: string) => void;
  setNickName: (name: string) => void;
  setImage: (image: string) => void;
};

const UserOnboardingContext = createContext<UserOnboarding | null>(null);

export const UserOnboardingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickName, setNickName] = useState("");
  const [image, setImage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [companyName, setCompanyName] = useState("");

  // ✅ Automatically preload Clerk image if no custom one selected
  useEffect(() => {
    if (user?.imageUrl && !image) {
      setImage(user.imageUrl);
    }
  }, [user, image]);

  return (
    <UserOnboardingContext.Provider
      value={{
        firstName,
        lastName,
        nickName,
        image,
        sessionId,
        companyName,
        setCompanyName,
        setFirstName,
        setLastName,
        setNickName,
        setSessionId,
        setImage,
      }}
    >
      {children}
    </UserOnboardingContext.Provider>
  );
};

export const useUserOnboarding = () => {
  const ctx = useContext(UserOnboardingContext);
  if (!ctx)
    throw new Error("UserOnboardingContext must be used within a provider");
  return ctx;
};
