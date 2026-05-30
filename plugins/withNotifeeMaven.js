const { withProjectBuildGradle } = require("@expo/config-plugins");

const NOTIFEE_MAVEN_MARKER = "// @generated begin notifee-maven";
const NOTIFEE_MAVEN_BLOCK = `
    ${NOTIFEE_MAVEN_MARKER}
    maven {
      url "$rootDir/../node_modules/@notifee/react-native/android/libs"
    }
    // @generated end notifee-maven`;

/**
 * Notifee native core (app.notifee:core) is bundled under node_modules, not Maven Central.
 * @see https://notifee.app/react-native/docs/installation
 */
function withNotifeeMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    if (contents.includes(NOTIFEE_MAVEN_MARKER)) {
      return config;
    }

    if (contents.includes("@notifee/react-native/android/libs")) {
      return config;
    }

    const jitpackNeedle = "maven { url 'https://www.jitpack.io' }";
    if (contents.includes(jitpackNeedle)) {
      contents = contents.replace(
        jitpackNeedle,
        `${jitpackNeedle}${NOTIFEE_MAVEN_BLOCK}`,
      );
    } else if (contents.includes("mavenCentral()")) {
      contents = contents.replace(
        /mavenCentral\(\)/,
        `mavenCentral()${NOTIFEE_MAVEN_BLOCK}`,
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withNotifeeMaven;
