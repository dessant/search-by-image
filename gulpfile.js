const path = require('node:path');
const {exec} = require('node:child_process');
const {
  lstatSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  rmSync
} = require('node:fs');

const {series, parallel, src, dest} = require('gulp');
const postcss = require('gulp-postcss');
const gulpif = require('gulp-if');
const jsonMerge = require('gulp-merge-json');
const jsonmin = require('gulp-jsonmin');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const {ensureDirSync} = require('fs-extra');
const recursiveReadDir = require('recursive-readdir');
const sharp = require('sharp');

const targetEnv = process.env.TARGET_ENV || 'chrome';
const isProduction = process.env.NODE_ENV === 'production';
const enableContributions =
  (process.env.ENABLE_CONTRIBUTIONS || 'true') === 'true';
const distDir = path.join(__dirname, 'dist', targetEnv);

function initEnv() {
  process.env.BROWSERSLIST_ENV = targetEnv;
}

function init(done) {
  initEnv();

  rmSync(distDir, {recursive: true, force: true});
  ensureDirSync(distDir);
  done();
}

function js(done) {
  exec('webpack-cli build --color', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    done(err);
  });
}

function html() {
  return src(
    enableContributions
      ? 'src/**/*.html'
      : ['src/**/*.html', '!src/contribute/*.html'],
    {base: '.'}
  )
    .pipe(gulpif(isProduction, htmlmin({collapseWhitespace: true})))
    .pipe(dest(distDir));
}

function css() {
  return src(
    [
      'src/content/style.css',
      'src/select/pointer.css',
      'src/engines/css/*.css'
    ],
    {base: '.'}
  )
    .pipe(postcss())
    .pipe(dest(distDir));
}

async function images(done) {
  ensureDirSync(path.join(distDir, 'src/assets/icons/app'));
  const appIconSvg = readFileSync('src/assets/icons/app/icon.svg');
  const appIconSizes = [16, 19, 24, 32, 38, 48, 64, 96, 128];
  if (targetEnv === 'safari') {
    appIconSizes.push(256, 512, 1024);
  }
  for (const size of appIconSizes) {
    await sharp(appIconSvg, {density: (72 * size) / 24})
      .resize(size)
      .toFile(path.join(distDir, `src/assets/icons/app/icon-${size}.png`));
  }
  // Chrome Web Store does not correctly display optimized icons
  if (isProduction && targetEnv !== 'chrome') {
    await new Promise(resolve => {
      src(path.join(distDir, 'src/assets/icons/app/*.png'), {
        base: '.',
        encoding: false
      })
        .pipe(imagemin())
        .pipe(dest('.'))
        .on('error', done)
        .on('finish', resolve);
    });
  }

  if (targetEnv === 'firefox') {
    ensureDirSync(path.join(distDir, 'src/assets/icons/engines'));
    const pngPaths = await recursiveReadDir('src/assets/icons/engines', [
      '*.!(png)'
    ]);
    const menuIconSizes = [16, 32];
    for (const pngPath of pngPaths) {
      for (const size of menuIconSizes) {
        await sharp(pngPath)
          .resize(size)
          .toFile(path.join(distDir, `${pngPath.slice(0, -4)}-${size}.png`));
      }
    }
    if (isProduction) {
      await new Promise(resolve => {
        src(path.join(distDir, 'src/assets/icons/engines/*.png'), {
          base: '.',
          encoding: false
        })
          .pipe(imagemin())
          .pipe(dest('.'))
          .on('error', done)
          .on('finish', resolve);
      });
    }
  }

  await new Promise(resolve => {
    src('src/assets/icons/@(app|engines|misc)/*.@(png|svg)', {
      base: '.',
      encoding: false
    })
      .pipe(gulpif(isProduction, imagemin()))
      .pipe(dest(distDir))
      .on('error', done)
      .on('finish', resolve);
  });

  if (enableContributions) {
    await new Promise(resolve => {
      src('node_modules/vueton/components/contribute/assets/*.@(png|svg)', {
        encoding: false
      })
        .pipe(gulpif(isProduction, imagemin()))
        .pipe(dest(path.join(distDir, 'src/contribute/assets')))
        .on('error', done)
        .on('finish', resolve);
    });
  }
}

async function fonts(done) {
  await new Promise(resolve => {
    src('src/assets/fonts/roboto.css', {base: '.'})
      .pipe(postcss())
      .pipe(dest(distDir))
      .on('error', done)
      .on('finish', resolve);
  });

  await new Promise(resolve => {
    src(
      'node_modules/@fontsource/roboto/files/roboto-latin-@(400|500|700)-normal.woff2',
      {encoding: false}
    )
      .pipe(dest(path.join(distDir, 'src/assets/fonts/files')))
      .on('error', done)
      .on('finish', resolve);
  });
}

async function locale(done) {
  const localesRootDir = path.join(__dirname, 'src/assets/locales');
  const localeDirs = readdirSync(localesRootDir).filter(function (file) {
    return lstatSync(path.join(localesRootDir, file)).isDirectory();
  });
  for (const localeDir of localeDirs) {
    const localePath = path.join(localesRootDir, localeDir);
    await new Promise(resolve => {
      src(
        [
          path.join(localePath, 'messages.json'),
          path.join(localePath, `messages-${targetEnv}.json`)
        ],
        {allowEmpty: true}
      )
        .pipe(
          jsonMerge({
            fileName: 'messages.json',
            edit: (parsedJson, file) => {
              if (isProduction) {
                for (let [key, value] of Object.entries(parsedJson)) {
                  if (value.hasOwnProperty('description')) {
                    delete parsedJson[key].description;
                  }
                }
              }
              return parsedJson;
            }
          })
        )
        .pipe(gulpif(isProduction, jsonmin()))
        .pipe(dest(path.join(distDir, '_locales', localeDir)))
        .on('error', done)
        .on('finish', resolve);
    });
  }
}

function manifest() {
  return src(`src/assets/manifest/${targetEnv}.json`)
    .pipe(
      jsonMerge({
        fileName: 'manifest.json',
        edit: (parsedJson, file) => {
          parsedJson.version = require('./package.json').version;
          return parsedJson;
        }
      })
    )
    .pipe(gulpif(isProduction, jsonmin()))
    .pipe(dest(distDir));
}

function license(done) {
  let year = '2017';
  const currentYear = new Date().getFullYear().toString();
  if (year !== currentYear) {
    year = `${year}-${currentYear}`;
  }

  let notice = `Search by Image
Copyright (c) ${year} Armin Sebastian
`;

  if (['safari', 'samsung'].includes(targetEnv)) {
    writeFileSync(path.join(distDir, 'NOTICE'), notice);
    done();
  } else {
    notice = `${notice}
This software is released under the terms of the GNU General Public License v3.0.
See the LICENSE file for further information.
`;
    writeFileSync(path.join(distDir, 'NOTICE'), notice);
    return src('LICENSE').pipe(dest(distDir));
  }
}

function zip(done) {
  exec(
    `web-ext build -s dist/${targetEnv} -a artifacts/${targetEnv} -n "{name}-{version}-${targetEnv}.zip" --overwrite-dest`,
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      done(err);
    }
  );
}

function inspect(done) {
  initEnv();

  exec(
    `npm run build:prod:chrome && \
    webpack --profile --json > report.json && \
    webpack-bundle-analyzer --mode static report.json dist/chrome/src && \
    sleep 3 && rm report.{json,html}`,
    function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      done(err);
    }
  );
}

exports.build = series(
  init,
  parallel(js, html, css, images, fonts, locale, manifest, license)
);
exports.zip = zip;
exports.inspect = inspect;
