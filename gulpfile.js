const path = require('path');
const {exec} = require('child_process');
const {lstatSync, readdirSync, readFileSync, writeFileSync} = require('fs');

const {ensureDirSync} = require('fs-extra');
const recursiveReadDir = require('recursive-readdir');
const gulp = require('gulp');
const gulpSeq = require('gulp-sequence');
const webpack = require('webpack');
const htmlmin = require('gulp-htmlmin');
const svgmin = require('gulp-svgmin');
const babel = require('gulp-babel');
const postcss = require('gulp-postcss');
const gulpif = require('gulp-if');
const del = require('del');
const jsonMerge = require('gulp-merge-json');
const jsonmin = require('gulp-jsonmin');
const svg2png = require('svg2png');
const imagemin = require('gulp-imagemin');

const targetEnv = process.env.TARGET_ENV || 'firefox';
const isProduction = process.env.NODE_ENV === 'production';

gulp.task('clean', function() {
  return del(['dist']);
});

gulp.task('js:webpack', function(done) {
  exec('webpack --display-error-details --colors', function(
    err,
    stdout,
    stderr
  ) {
    console.log(stdout);
    console.log(stderr);
    done(err);
  });
});

gulp.task('js:babel', function() {
  return gulp
    .src(['src/content/**/*.js'], {base: '.'})
    .pipe(babel())
    .pipe(gulp.dest('dist'));
});

gulp.task('js', ['js:webpack', 'js:babel']);

gulp.task('html', function() {
  return gulp
    .src('src/**/*.html', {base: '.'})
    .pipe(gulpif(isProduction, htmlmin({collapseWhitespace: true})))
    .pipe(gulp.dest('dist'));
});

gulp.task('css', function() {
  return gulp
    .src(
      [
        'src/select/frame.css',
        'src/select/pointer.css',
        'src/confirm/frame.css',
        'src/content/engines/style.css'
      ],
      {
        base: '.'
      }
    )
    .pipe(postcss())
    .pipe(gulp.dest('dist'));
});

gulp.task('icons', async function() {
  ensureDirSync('dist/src/icons/app');
  const iconSvg = readFileSync('src/icons/app/icon.svg');
  const iconSizes = [16, 19, 24, 32, 38, 48, 64, 96, 128];
  for (const size of iconSizes) {
    const pngBuffer = await svg2png(iconSvg, {width: size, height: size});
    writeFileSync(`dist/src/icons/app/icon-${size}.png`, pngBuffer);
  }

  ensureDirSync('dist/src/icons/engines');
  const svgPaths = await recursiveReadDir('src/icons', [
    'src/icons/@(app|modes|browse)/*',
    '*.!(svg)'
  ]);
  for (svgPath of svgPaths) {
    const pngBuffer = await svg2png(readFileSync(svgPath));
    writeFileSync(
      path.join('dist', svgPath.replace(/^(.*)\.svg$/i, '$1.png')),
      pngBuffer
    );
  }

  if (isProduction) {
    gulp
      .src('dist/src/icons/**/*.png', {base: '.'})
      .pipe(imagemin())
      .pipe(gulp.dest(''));
  }

  gulp
    .src('src/icons/@(modes|browse)/*.svg', {base: '.'})
    .pipe(gulpif(isProduction, svgmin()))
    .pipe(gulp.dest('dist'));
  gulp
    .src('node_modules/ext-contribute/src/assets/*.svg')
    .pipe(gulpif(isProduction, svgmin()))
    .pipe(gulp.dest('dist/src/contribute/assets'));
});

gulp.task('fonts', function() {
  gulp
    .src('src/fonts/roboto.css', {base: '.'})
    .pipe(postcss())
    .pipe(gulp.dest('dist'));
  gulp
    .src('node_modules/typeface-roboto/files/roboto-latin-@(400|500|700).woff2')
    .pipe(gulp.dest('dist/src/fonts/files'));
});

gulp.task('locale', function() {
  const localesRootDir = path.join(__dirname, 'src/_locales');
  const localeDirs = readdirSync(localesRootDir).filter(function(file) {
    return lstatSync(path.join(localesRootDir, file)).isDirectory();
  });
  localeDirs.forEach(function(localeDir) {
    const localePath = path.join(localesRootDir, localeDir);
    gulp
      .src([
        path.join(localePath, 'messages.json'),
        path.join(localePath, `messages-${targetEnv}.json`)
      ])
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
      .pipe(gulp.dest(path.join('dist/_locales', localeDir)));
  });
});

gulp.task('manifest', function() {
  return gulp
    .src('src/manifest.json')
    .pipe(
      jsonMerge({
        fileName: 'manifest.json',
        edit: (parsedJson, file) => {
          if (['chrome', 'opera'].includes(targetEnv)) {
            delete parsedJson.applications;
            delete parsedJson.browser_action.browser_style;
            delete parsedJson.options_ui.browser_style;
            const urlPatterns = parsedJson.content_scripts[0].matches;
            parsedJson.content_scripts[0].matches = urlPatterns.filter(
              item => item !== 'file:///*'
            );
          }

          if (['chrome', 'firefox'].includes(targetEnv)) {
            delete parsedJson.minimum_opera_version;
          }

          if (['firefox', 'opera'].includes(targetEnv)) {
            delete parsedJson.minimum_chrome_version;
          }

          if (targetEnv === 'firefox') {
            delete parsedJson.options_ui.chrome_style;
          }

          parsedJson.version = require('./package.json').version;
          return parsedJson;
        }
      })
    )
    .pipe(gulpif(isProduction, jsonmin()))
    .pipe(gulp.dest('dist'));
});

gulp.task('copy', function() {
  gulp
    .src('node_modules/ext-contribute/src/assets/*.@(jpg|png)')
    .pipe(gulp.dest('dist/src/contribute/assets'));
  gulp.src(['LICENSE', 'src*/icons/**/*.@(jpg|png)']).pipe(gulp.dest('dist'));
});

gulp.task(
  'build',
  gulpSeq('clean', [
    'js',
    'html',
    'css',
    'icons',
    'fonts',
    'locale',
    'manifest',
    'copy'
  ])
);

gulp.task('default', ['build']);
