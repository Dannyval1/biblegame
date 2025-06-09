const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure AsyncStorage and Firebase are properly resolved
config.resolver.alias = {
  ...config.resolver.alias,
  '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage',
};

// Add support for Firebase modules
config.resolver.platforms = ['native', 'web', 'ios', 'android'];
// Firebase compatibility fixes for Expo SDK 53
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;