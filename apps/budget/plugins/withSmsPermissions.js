// Adds the Android SMS permissions needed for auto-capture.
// Applied at prebuild / EAS build time (not relevant to Expo Go).
const { AndroidConfig } = require("@expo/config-plugins");

module.exports = function withSmsPermissions(config) {
  return AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.READ_SMS",
    "android.permission.RECEIVE_SMS",
  ]);
};
