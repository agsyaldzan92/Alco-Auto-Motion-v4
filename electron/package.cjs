/**
 * Electron Builder Packaging Configuration for ALCO Auto Motion
 * Target: Windows (NSIS / portable)
 */
module.exports = {
  appId: 'com.alco.automotion',
  productName: 'ALCO Auto Motion',
  copyright: 'Copyright © 2026 Aladzan Corpora Ecosystem',
  directories: {
    output: 'dist-electron',
    buildResources: 'build',
  },
  files: [
    'dist/**/*',
    'electron/**/*',
    'public/**/*',
    'package.json',
  ],
  extraResources: [
    {
      from: 'resources/ffmpeg',
      to: 'ffmpeg',
      filter: ['**/*'],
    },
  ],
  asar: true,
  asarUnpack: [
    'dist/server.cjs',
    'dist/**/*',
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    artifactName: '${productName}-Setup-${version}.${ext}',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'ALCO Auto Motion',
  },
};
