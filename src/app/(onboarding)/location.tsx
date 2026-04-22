import { View, Text, Pressable, StatusBar } from "react-native";
import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TypeWriter from "react-native-typewriter";
import { useUser } from "@clerk/clerk-expo";
import axios from "axios";
import { router } from "expo-router";
import { Dropdown } from "react-native-element-dropdown";
import iebc from "../../../assets/data/iebc.json";
import { useTheme } from "@/context/ThemeContext";

export default function LocationSelection() {
  const { theme, isDark } = useTheme();
  const { user } = useUser();

  const [selectedCounty, setSelectedCounty] = useState(null);
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);
  const [loading, setLoading] = useState(false);


  // Derived data
  const constituencies = useMemo(() => {
    if (!selectedCounty) return [];
    const county = iebc.counties.find((c) => c.name === selectedCounty);
    return county?.constituencies || [];
  }, [selectedCounty]);

  const wards = useMemo(() => {
    if (!selectedConstituency) return [];
    const constituency = constituencies.find(
      (c) => c.name === selectedConstituency,
    );
    return constituency?.wards || [];
  }, [selectedConstituency, constituencies]);

  const saveLocation = async () => {
    if (loading || !user?.id) return;

    setLoading(true);
    try {
      await axios.post(
        "https://cast-api-zeta.vercel.app/api/users/update-location",
        {
          clerkId: user.id,
          county: selectedCounty,
          constituency: selectedConstituency,
          ward: selectedWard,
        },
      );

      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
        },
      });


      router.replace("/(drawer)/(tabs)");
    } catch (err) {
      console.log("❌ Save failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const dropdownStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: "center",
        paddingHorizontal: 20,
      }}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View style={{ height: 120 }}>
        <TypeWriter
          typing={1}
          style={{
            margin: 20,
            fontSize: 20,
            fontWeight: "bold",
            textAlign: "center",
            color: theme.text,
          }}
        >
          Welcome to BroadCast, In pursuit of a perfect nation.
        </TypeWriter>
      </View>

      {/* COUNTY */}
      <Text style={{ fontWeight: "bold", fontSize: 18, color: theme.text }}>
        County
      </Text>
      <Dropdown
        style={dropdownStyle}
        data={iebc.counties}
        labelField="name"
        valueField="name"
        placeholder="Select County"
        value={selectedCounty}
        search
        searchPlaceholder="Search county..."
        onChange={(item) => {
          setSelectedCounty(item.name);
          setSelectedConstituency(null);
          setSelectedWard(null);
        }}
      />

      {/* CONSTITUENCY */}
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 18,
          color: theme.text,
          marginTop: 15,
        }}
      >
        Constituency
      </Text>
      <Dropdown
        style={dropdownStyle}
        data={constituencies}
        labelField="name"
        valueField="name"
        placeholder="Select Constituency"
        value={selectedConstituency}
        search
        searchPlaceholder="Search constituency..."
        disable={!selectedCounty}
        onChange={(item) => {
          setSelectedConstituency(item.name);
          setSelectedWard(null);
        }}
      />

      {/* WARD */}
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 18,
          color: theme.text,
          marginTop: 15,
        }}
      >
        Ward
      </Text>
      <Dropdown
        style={dropdownStyle}
        data={wards}
        labelField="name"
        valueField="name"
        placeholder="Select Ward"
        value={selectedWard}
        search
        searchPlaceholder="Search ward..."
        disable={!selectedConstituency}
        onChange={(item) => {
          setSelectedWard(item.name);
        }}
      />

      {/* Preview */}
      <Text style={{ marginTop: 20, color: theme.subtext }}>
        ✅ {selectedCounty || "-"}
        {selectedConstituency ? ` → ${selectedConstituency}` : ""}
        {selectedWard ? ` → ${selectedWard}` : ""}
      </Text>

      {/* BUTTON */}
      {selectedCounty && selectedConstituency && selectedWard && (
        <Pressable
          onPress={saveLocation}
          style={{
            backgroundColor: theme.primary,
            padding: 16,
            borderRadius: 12,
            marginTop: 30,
          }}
        >
          <Text
            style={{ color: "#fff", textAlign: "center", fontWeight: "bold" }}
          >
            {loading ? "Saving..." : "Save & Continue"}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}