// Babel config for Expo.
//
// The "module-resolver" plugin lets us import from "@/..." (which points at
// the src/ folder) instead of long relative paths like "../../../src/theme".
// This keeps imports short and readable as the app grows.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};