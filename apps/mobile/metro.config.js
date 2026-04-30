const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Soporte para .mjs (requerido por algunos paquetes ESM como supabase-js)
config.resolver.sourceExts.push("mjs");

// Package exports para tree-shaking correcto (reduce bundle size en web)
config.resolver.unstable_enablePackageExports = true;

// Evita re-resolver módulos ya procesados (acelera reloads en desarrollo)
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
