import {
  View,
  Text,
  Pressable,
  StatusBar,
  StyleSheet,
  ScrollView,
} from "react-native";
import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TypeWriter from "react-native-typewriter";
import { useUser } from "@clerk/clerk-expo";
import axios from "axios";
import { router } from "expo-router";
import { Dropdown } from "react-native-element-dropdown";
import iebc from "../../../assets/data/iebc.json";
import { useTheme } from "@/context/ThemeContext";
import { API_PUBLIC_URL } from "@/constants/api";

export default function LocationSelection() {
  const { theme, isDark } = useTheme();
  const { user } = useUser();

  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedConstituency, setSelectedConstituency] = useState<
    string | null
  >(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canSubmit =
    Boolean(selectedCounty) &&
    Boolean(selectedConstituency) &&
    Boolean(selectedWard) &&
    !loading;

  const constituencies = useMemo(() => {
    if (!selectedCounty) return [];
    const county = iebc.counties.find((c) => c.name === selectedCounty);
    return county?.constituencies || [];
  }, [selectedCounty]);

  const wards = useMemo(() => {
    if (!selectedConstituency) return [];
    const constituency = constituencies.find(
      (c) => c.name === selectedConstituency
    );
    return constituency?.wards || [];
  }, [selectedConstituency, constituencies]);

  const saveLocation = async () => {
    if (loading || !user?.id) return;

    setLoading(true);

    try {
      await axios.post(
        `${API_PUBLIC_URL}/api/users/update-location`,
        {
          clerkId: user.id,
          county: selectedCounty,
          constituency: selectedConstituency,
          ward: selectedWard,
        }
      );

      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingComplete: true,
        },
      });

      router.replace("/(drawer)/(tabs)");
    } catch (err) {
      console.log("Save failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const dropdownStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: theme.background,
  };

  const dropdownProps = {
    style: dropdownStyle,
    containerStyle: {
      backgroundColor: theme.card,
      borderRadius: 10,
      borderColor: theme.border,
    },
    itemContainerStyle: {
      backgroundColor: theme.card,
    },
    itemTextStyle: {
      color: theme.text,
    },
    selectedTextStyle: {
      color: theme.text,
    },
    placeholderStyle: {
      color: theme.subtext,
    },
    searchInputStyle: {
      color: theme.text,
      backgroundColor: theme.background,
      borderRadius: 8,
    },
    searchPlaceholderTextColor: theme.subtext,
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerWrap}>
          <Text style={[styles.title, { color: theme.text }]}>
            Set Your Location
          </Text>
          <TypeWriter typing={1} style={[styles.subtitle, { color: theme.subtext }]}>
            Choose your county, constituency, and ward to personalize your feed.
          </TypeWriter>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.label, { color: theme.text }]}>County</Text>
          <Dropdown
            {...dropdownProps}
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

          <Text style={[styles.label, { color: theme.text }]}>Constituency</Text>
          <Dropdown
            {...dropdownProps}
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

          <Text style={[styles.label, { color: theme.text }]}>Ward</Text>
          <Dropdown
            {...dropdownProps}
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

          <View
            style={[
              styles.previewBox,
              { borderColor: theme.border, backgroundColor: theme.background },
            ]}
          >
            <Text style={[styles.previewLabel, { color: theme.subtext }]}>
              Selected Location
            </Text>
            <Text style={[styles.previewValue, { color: theme.text }]}>
              {selectedCounty || "-"}
              {selectedConstituency ? `  >  ${selectedConstituency}` : ""}
              {selectedWard ? `  >  ${selectedWard}` : ""}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={saveLocation}
          disabled={!canSubmit}
          style={[
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? theme.primary : theme.border,
              opacity: canSubmit ? 1 : 0.7,
            },
          ]}
        >
          <Text style={styles.submitText}>
            {loading ? "Saving..." : "Save & Continue"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerWrap: {
    marginBottom: 18,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    minHeight: 40,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontWeight: "700",
    fontSize: 14,
    marginTop: 14,
  },
  previewBox: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 16,
    padding: 12,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
  },
});