import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  Image,
  Alert,
} from "react-native";
import axios from "axios";
import { useUser } from "@clerk/clerk-expo";

const VerifyButton = () => {
  const { user } = useUser();     
  const [loading, setLoading] = useState(false);
  const [verificationStarted, setVerificationStarted] = useState(false);
  const [verified, setVerified] = useState(false);

  // ✅ On mount, check user verification status
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      try {
        const res = await axios.get(
          `https://cast-api-zeta.vercel.app/api/users/${user.id}`,
        );
        setVerified(res.data.isVerified || false);

        // If token exists but not verified yet → verification in progress
        if (!res.data.isVerified && res.data.verifyToken) {
          setVerificationStarted(true);
        }
      } catch (err) {
        console.error("Error checking verification status:", err);
      }
    };
    checkStatus();
  }, [user]);

  // ✅ Poll backend every 5s if verification is in progress
  useEffect(() => {
    let interval: any;
    if (!verified && verificationStarted && user) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(
            `https://cast-api-zeta.vercel.app/api/users/${user.id}`,
          );
          if (res.data.isVerified) {
            setVerified(true);
            setVerificationStarted(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [verified, verificationStarted, user]);

  const handleVerify = async () => {
    if (!user) return;
    try {
      setLoading(true);
      await axios.post("https://cast-api-zeta.vercel.app/api/verify", {
        email: user.primaryEmailAddress?.emailAddress,
      });
      //   Alert.alert(
      //     "Your Verification has seent!",
      //     "Click okay to proceed!",
      //     [{ text: "OK", style: "default" }]
      //   );
      setVerificationStarted(true);
    } catch (err) {
      console.error("Verification error:", err);
      Alert.alert(
        "❌ Error",
        "Failed to send verification email check your internet connection. Try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      className={`flex-row items-center  rounded-full px-4 py-2 shadow-md ${
        verified
          ? "bg-gray-100"
          : verificationStarted
            ? "bg-yellow-100 border-yellow-400"
            : "bg-white border-gray-100"
      }`}
      activeOpacity={0.8}
      onPress={handleVerify}
      disabled={loading || verified || verificationStarted}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : verified ? (
        <View className="flex-row items-center">
          <Text className="text-gray-700 text-sm font-medium">Verified </Text>
          {/* <Image
            source={require("@/assets/verif.png")}
            style={{ width: 20, height: 20, marginLeft: 6 }}
          /> */}
        </View>
      ) : verificationStarted ? (
        <View className="flex-row items-center">
          {/* <ActivityIndicator size="small" color="#000" /> */}
          <Text className="ml-2 text-sm font-medium text-yellow-800">
            Verification in Progress…
          </Text>
        </View>
      ) : (
        <Text className="text-sm font-medium text-gray-700">
          Verify Account
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default VerifyButton;
