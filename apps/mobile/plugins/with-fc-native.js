const { withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const FILES = [
  'ScreenRecorder.swift',
  'ScreenRecorder.m',
  'OrientationPolicy.swift',
  'OrientationPolicy.m',
];

/** 把录屏和横屏锁编进 EAS 预生成的 iOS 工程。 */
function withFcNative(config) {
  return withXcodeProject(config, (cfg) => {
    const projectName = cfg.modRequest.projectName;
    if (!projectName) {
      throw new Error('with-fc-native: missing projectName');
    }
    const srcDir = path.join(__dirname, 'native');
    const nativeRoot = cfg.modRequest.platformProjectRoot;
    for (const name of FILES) {
      const contents = fs.readFileSync(path.join(srcDir, name), 'utf8');
      cfg.modResults = IOSConfig.XcodeProjectFile.createBuildSourceFile({
        project: cfg.modResults,
        nativeProjectRoot: nativeRoot,
        filePath: `${projectName}/${name}`,
        fileContents: contents,
        overwrite: true,
      });
    }
    IOSConfig.XcodeUtils.addFramework({
      project: cfg.modResults,
      projectName,
      framework: 'ReplayKit.framework',
    });
    IOSConfig.XcodeUtils.addFramework({
      project: cfg.modResults,
      projectName,
      framework: 'Photos.framework',
    });
    return cfg;
  });
}

module.exports = withFcNative;
