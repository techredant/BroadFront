const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Resolves manifest merger conflict between expo-notifications and
 * @react-native-firebase/messaging for default_notification_channel_id.
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
    }

    return config;
  });
}

module.exports = withFirebaseNotificationManifest;
