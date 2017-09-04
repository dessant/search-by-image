const path = require('path');
const {lstatSync, readdirSync, readFileSync, writeFileSync} = require('fs');
const {ensureDirSync} = require('fs-extra');
const recursiveReadDir = require('recursive-readdir');
const exec = require('child_process').exec;
const gulp = require('gulp');
const gulpSeq = require('gulp-sequence');
const webpack = require('webpack');
const htmlmin = require('gulp-htmlmin');
const babel = require('gulp-babel');
const postcss = require('gulp-postcss');
const gulpif = require('gulp-if');
const del = require('del');
const jsonMerge = require('gulp-merge-json');
const jsBeautify = require('gulp-jsbeautifier');
const svg2png = require('svg2png');
const rsvg = require('gulp-rsvg');
const imagemin = require('gulp-imagemin');

const targetEnv = process.env.TARGET_ENV || 'firefox';
const isProduction = process.env.NODE_ENV === 'production';
const sysDeps = process.env.SYS_DEPS || 'true';

const jsBeautifyOptions = {
  indent_size: 2,
  preserve_newlines: false,
  end_with_newline: true
};

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
    .src(['src/select/frame.css', 'src/content/engines/style.css'], {base: '.'})
    .pipe(postcss())
    .pipe(gulp.dest('dist'));
});

gulp.task('iconsPhantomJs', async function() {
  ensureDirSync('dist/src/icons');
  const svgPaths = await recursiveReadDir('src/icons', ['*.!(svg)']);
  for (svgPath of svgPaths) {
    const pngBuffer = await svg2png(readFileSync(svgPath));
    writeFileSync(
      path.join('dist', svgPath.replace(/^(.*)\.svg$/i, '$1.png')),
      pngBuffer
    );
  }

  if (isProduction) {
    gulp
      .src('dist/src/**/*.png', {base: '.'})
      .pipe(imagemin())
      .pipe(gulp.dest(''));
  }
});

gulp.task('iconsRsvg', function() {
  return gulp
    .src('src/**/*.svg', {base: '.'})
    .pipe(rsvg())
    .pipe(gulpif(isProduction, imagemin()))
    .pipe(gulp.dest('dist'));
});

gulp.task('icons', [sysDeps === 'true' ? 'iconsRsvg' : 'iconsPhantomJs']);

gulp.task('fonts', function() {
  gulp
    .src('src/fonts/roboto.css', {base: '.'})
    .pipe(postcss())
    .pipe(gulp.dest('dist'));
  gulp
    .src('node_modules/typeface-roboto/files/roboto-latin-@(400|500).woff2')
    .pipe(gulp.dest('dist/src/fonts/files'));
});

gulp.task('locale', function() {
  const customTargets = ['firefox'];
  if (customTargets.indexOf(targetEnv) !== -1) {
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
        .pipe(jsonMerge({fileName: 'messages.json'}))
        .pipe(gulpif(isProduction, jsBeautify(jsBeautifyOptions)))
        .pipe(gulp.dest(path.join('dist/_locales', localeDir)));
    });
  } else {
    gulp
      .src('src/_locales/**/messages.json')
      .pipe(gulpif(isProduction, jsBeautify(jsBeautifyOptions)))
      .pipe(gulp.dest('dist/_locales'));
  }
});

gulp.task('manifest', function() {
  return gulp
    .src('src/manifest.json')
    .pipe(
      jsonMerge({
        fileName: 'manifest.json',
        jsonSpace: '  ',
        edit: (parsedJson, file) => {
          if (['chrome', 'opera'].indexOf(targetEnv) !== -1) {
            delete parsedJson.applications;
            delete parsedJson.options_ui.browser_style;
          }

          if (['firefox', 'chrome'].indexOf(targetEnv) !== -1) {
            delete parsedJson.minimum_opera_version;
          }

          if (['firefox', 'opera'].indexOf(targetEnv) !== -1) {
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
    .pipe(gulpif(isProduction, jsBeautify(jsBeautifyOptions)))
    .pipe(gulp.dest('dist'));
});

gulp.task('copy', function() {
  gulp.src(['LICENSE']).pipe(gulp.dest('dist'));
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
