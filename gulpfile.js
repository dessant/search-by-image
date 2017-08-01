var path = require('path');
var {lstatSync, readdirSync} = require('fs');
var exec = require('child_process').exec;
var gulp = require('gulp');
var gulpSeq = require('gulp-sequence');
var webpack = require('webpack');
var htmlmin = require('gulp-htmlmin');
var svgmin = require('gulp-svgmin');
var babel = require('gulp-babel');
var postcss = require('gulp-postcss');
var gulpif = require('gulp-if');
var del = require('del');
var jsonMerge = require('gulp-merge-json');
var jsBeautify = require('gulp-jsbeautifier');

const targetEnv = process.env.TARGET_ENV;
const isProduction = process.env.NODE_ENV === 'production';

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

gulp.task('svg', function() {
  return gulp
    .src('src/**/*.svg', {base: '.'})
    .pipe(gulpif(isProduction, svgmin()))
    .pipe(gulp.dest('dist'));
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

gulp.task('copy', function() {
  gulp.src(['src/manifest.json', 'LICENSE']).pipe(gulp.dest('dist'));
});

gulp.task(
  'build',
  gulpSeq('clean', ['js', 'html', 'css', 'svg', 'locale', 'copy'])
);

gulp.task('default', ['build']);
