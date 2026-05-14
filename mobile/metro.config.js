const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Block native Gradle build artifacts. These dirs are created/deleted during
 * native builds and cause ENOENT crashes in the Metro file watcher on Windows.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: [
      /.*[\\/]android[\\/]\.cxx[\\/].*/,
      /.*[\\/]android[\\/]build[\\/].*/,
      /.*[\\/]android[\\/]\.gradle[\\/].*/,
      /.*[\\/]android[\\/]app[\\/]build[\\/].*/,
    ],
  },
  watchFolders: [path.resolve(__dirname)],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
