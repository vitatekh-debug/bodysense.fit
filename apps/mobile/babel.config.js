module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated plugin DEBE ir al final de la lista.
    plugins: ["react-native-reanimated/plugin"],
  };
};
