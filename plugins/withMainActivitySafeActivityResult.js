const { withMainActivity } = require("@expo/config-plugins");

const IMPORT = "import android.content.Intent";
const GUARD_MARKER = "// @generated begin broadcast-safe-activity-result";

const GUARD_BLOCK = `
  ${GUARD_MARKER}
  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (reactDelegate == null) {
      return
    }
    try {
      super.onActivityResult(requestCode, resultCode, data)
    } catch (e: RuntimeException) {
      if (e.cause is NullPointerException) {
        return
      }
      throw e
    }
  }
  // @generated end broadcast-safe-activity-result
`;

/**
 * Prevents cold-start crash when a permission/OAuth dialog returns before RN is ready.
 * ReactActivityDelegate.onActivityResult NPEs if mReactDelegate is still null.
 */
function withMainActivitySafeActivityResult(config) {
  return withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      return config;
    }

    let contents = config.modResults.contents;
    if (contents.includes(GUARD_MARKER)) {
      return config;
    }

    if (!contents.includes(IMPORT)) {
      contents = contents.replace(
        /import android\.os\.Bundle\n/,
        `import android.os.Bundle\n${IMPORT}\n`,
      );
    }

    const anchor = "override fun getMainComponentName()";
    if (!contents.includes(anchor)) {
      return config;
    }

    config.modResults.contents = contents.replace(
      anchor,
      `${GUARD_BLOCK}\n\n  ${anchor}`,
    );

    return config;
  });
}

module.exports = withMainActivitySafeActivityResult;
