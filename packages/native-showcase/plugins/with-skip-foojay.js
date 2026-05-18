/**
 * Expo config plugin: disable Gradle's automatic JDK download.
 *
 * `@react-native/gradle-plugin@<future>` pins
 * `foojay-resolver-convention@0.5.0`, which references
 * `JvmVendorSpec.IBM_SEMERU` - a constant Gradle 9 removed. Setting
 * `org.gradle.java.installations.auto-download=false` short-circuits
 * foojay; Gradle falls back to the locally-installed JDK.
 *
 * RN main has bumped foojay to 1.0.0 already; remove this plugin once
 * the fix ships in a published `@react-native/gradle-plugin` cut.
 * Tracked at facebook/react-native#55781 and #56287.
 */
const { withGradleProperties } = require('expo/config-plugins');

const KEY = 'org.gradle.java.installations.auto-download';

module.exports = function withSkipFoojay(config) {
  return withGradleProperties(config, cfg => {
    const props = cfg.modResults;
    const existing = props.find(p => p.type === 'property' && p.key === KEY);
    if (existing) {
      existing.value = 'false';
    } else {
      props.push({ type: 'property', key: KEY, value: 'false' });
    }
    return cfg;
  });
};
