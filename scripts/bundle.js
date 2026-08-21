const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.resolve(__dirname, '../dist/main.js')],
  bundle: true,
  outfile: path.resolve(__dirname, '../dist/bundle.js'),
  format: 'iife', // 油猴脚本需要立即执行
  platform: 'browser', // Target browser environment
  target: 'es2019',
}).catch(() => process.exit(1));
