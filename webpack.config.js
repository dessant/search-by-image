const path = require('node:path');
const {lstat, readdir} = require('node:fs/promises');

const webpack = require('webpack');
const {VueLoaderPlugin} = require('vue-loader');
const {VuetifyPlugin} = require('webpack-plugin-vuetify');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const appVersion = require('./package.json').version;
const storageRevisions = require('./src/storage/config.json').revisions;

module.exports = async function (env, argv) {
  const targetEnv = process.env.TARGET_ENV || 'chrome';
  const isProduction = process.env.NODE_ENV === 'production';
  const enableContributions =
    (process.env.ENABLE_CONTRIBUTIONS || 'true') === 'true';

  const mv3 = env.mv3 === 'true';

  const provideExtApi = !['firefox', 'safari'].includes(targetEnv);

  const provideModules = {};
  if (provideExtApi) {
    provideModules.browser = 'webextension-polyfill';
  }

  const plugins = [
    new webpack.DefinePlugin({
      'process.env': {
        TARGET_ENV: JSON.stringify(targetEnv),
        STORAGE_REVISION_LOCAL: JSON.stringify(storageRevisions.local.at(-1)),
        STORAGE_REVISION_SESSION: JSON.stringify(
          storageRevisions.session.at(-1)
        ),
        ENABLE_CONTRIBUTIONS: JSON.stringify(enableContributions.toString()),
        APP_VERSION: JSON.stringify(appVersion),
        MV3: JSON.stringify(mv3.toString())
      },
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
    }),
    new webpack.ProvidePlugin(provideModules),
    new webpack.NormalModuleReplacementPlugin(/node:/, resource => {
      const mod = resource.request.replace(/^node:/, '');
      if (mod === 'buffer') {
        resource.request = 'buffer';
      } else if (mod === 'stream') {
        resource.request = 'readable-stream';
      }
    }),
    new VueLoaderPlugin(),
    new VuetifyPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name]/style.css',
      ignoreOrder: true
    })
  ];

  const enginesRootDir = path.join(__dirname, 'src/engines');

  const engines = (
    await Promise.all(
      (await readdir(enginesRootDir)).map(async function (file) {
        if ((await lstat(path.join(enginesRootDir, file))).isFile()) {
          return file.split('.')[0];
        }
      })
    )
  ).filter(Boolean);

  const entries = Object.fromEntries(
    engines.map(engine => [engine, `./src/engines/${engine}.js`])
  );

  if (enableContributions) {
    entries.contribute = './src/contribute/main.js';
  }

  return {
    mode: isProduction ? 'production' : 'development',
    entry: {
      background: './src/background/main.js',
      options: './src/options/main.js',
      action: './src/action/main.js',
      select: './src/select/main.js',
      capture: './src/capture/main.js',
      confirm: './src/confirm/main.js',
      overlay: './src/overlay/main.js',
      browse: './src/browse/main.js',
      search: './src/search/main.js',
      view: './src/view/main.js',
      base: './src/base/main.js',
      content: './src/content/main.js',
      parse: './src/parse/main.js',
      tab: './src/tab/main.js',
      ...entries
    },
    output: {
      path: path.resolve(__dirname, 'dist', targetEnv, 'src'),
      filename: pathData => {
        return engines.includes(pathData.chunk.name)
          ? 'engines/[name]/script.js'
          : '[name]/script.js';
      },
      chunkFilename: '[name]/script.js',
      asyncChunks: false
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          default: false,
          commonsUi: {
            name: 'commons-ui',
            chunks: chunk => {
              return [
                'options',
                'action',
                'select',
                'capture',
                'confirm',
                'overlay',
                'browse',
                'search',
                'view',
                'contribute'
              ].includes(chunk.name);
            },
            minChunks: 2
          },
          commonsEngine: {
            name: 'commons-engine',
            chunks: chunk => engines.includes(chunk.name),
            minChunks: 2
          }
        }
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: 'babel-loader',
          resolve: {
            fullySpecified: false
          }
        },
        {
          test: /\.vue$/,
          use: [
            {
              loader: 'vue-loader',
              options: {
                transformAssetUrls: {img: ''},
                compilerOptions: {whitespace: 'preserve'}
              }
            }
          ]
        },
        {
          test: /\.(c|sc|sa)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {
                api: 'legacy',
                sassOptions: {
                  includePaths: ['node_modules'],
                  silenceDeprecations: ['legacy-js-api'],
                  quietDeps: true
                },
                additionalData: (content, loaderContext) => {
                  return `
                  $target-env: "${targetEnv}";
                  ${content}
                `;
                }
              }
            }
          ]
        }
      ]
    },
    resolve: {
      modules: [path.resolve(__dirname, 'src'), 'node_modules'],
      extensions: ['.js', '.json', '.css', '.scss', '.vue'],
      fallback: {fs: false}
    },
    performance: {
      hints: false
    },
    devtool: false,
    plugins
  };
};
