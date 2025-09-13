// Reanimated v4 uses the worklets plugin (keep it LAST)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["@react-native/babel-preset"],
    //plugins: ["react-native-worklets/plugin"]
  };
};
