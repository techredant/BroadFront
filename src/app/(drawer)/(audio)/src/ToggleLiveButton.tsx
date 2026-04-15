import { useCall, useCallStateHooks } from '@stream-io/video-react-native-sdk';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ToggleLiveButton = () => {
  const call = useCall();
  const { useIsCallLive } = useCallStateHooks();
  const isLive = useIsCallLive();

  const handlePress = () => {
    if (!call) return;

    if (isLive) {
      call.stopLive();
    } else {
      call.goLive();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        isLive ? styles.liveButton : styles.offlineButton,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {isLive && <View style={styles.liveDot} />}
        <Ionicons
          name={isLive ? 'radio' : 'play'}
          size={24}
          color="red"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.text}>{isLive ? 'LIVE' : 'Go Live'}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 50,
    height: 50,
    borderRadius: 35, // circular like mic button
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
   
  },
  liveButton: {
      backgroundColor: 'red',
  },
  offlineButton: {
    backgroundColor: '#7C3AED', // purple when offline
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
        shadowRadius: 6,
  },
  text: {
    color: 'red',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    marginRight: 6,
  },
 
  active: { backgroundColor: '#7C3AED' },
  muted: { backgroundColor: '#EF4444' },
});
