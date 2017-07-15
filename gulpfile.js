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

gulp.task('copy', function() {
  gulp
    .src(['src/manifest.json', 'src/_locales*/**/*', 'LICENSE'])
    .pipe(gulp.dest('dist'));
});

gulp.task('build', gulpSeq('clean', ['js', 'html', 'css', 'svg', 'copy']));

gulp.task('default', ['build']);
