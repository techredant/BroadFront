const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Resolves manifest merger conflicts between expo-notifications and
 * @react-native-firebase/messaging for FCM default notification meta-data.
 */
function withFirebaseNotificationManifest(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application?.["meta-data"]) return config;

    for (const item of application["meta-data"]) {
      const name = item.$?.["android:name"];
      if (
        name === "com.google.firebase.messaging.default_notification_channel_id"
      ) {
        item.$["tools:replace"] = "android:value";
      }
      if (
        name === "com.google.firebase.messaging.default_notification_color"
      ) {
        item.$["tools:replace"] = "android:resource";
      }
    }

    return config;
  });
}

module.exports = withFirebaseNotificationManifest;
