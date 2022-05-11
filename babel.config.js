const path = require('path');

const corejsVersion = require(path.join(
  path.dirname(require.resolve('core-js')),
  'package.json'
)).version;

module.exports = function (api) {
  const presets = [
    [
      '@babel/env',
      {
        modules: false,
        bugfixes: true,
        useBuiltIns: 'usage',
        corejs: {version: corejsVersion}
      }
    ]
  ];

  const plugins = [];

  const ignore = [/node_modules\/(?!(ext-components|ext-contribute|wesa)\/).*/];

  const parserOpts = {plugins: ['importAssertions']};

  if (api.env('production')) {
    plugins.push('lodash');
  }

  return {presets, plugins, ignore, parserOpts};
};
