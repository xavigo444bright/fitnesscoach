const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Expo 54 默认 assetExts 不含 glb；不配的话 require('*.glb') 会报文件不存在。
const assetExts = config.resolver.assetExts.filter((ext) => ext !== 'glb');
const sourceExts = config.resolver.sourceExts.filter((ext) => ext !== 'glb');
config.resolver.assetExts = [...assetExts, 'glb', 'gltf'];
config.resolver.sourceExts = sourceExts;

module.exports = config;
