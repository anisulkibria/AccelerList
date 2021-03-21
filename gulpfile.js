const pump = require('pump');
const beeper = require('beeper');
const {series, watch, src, dest, parallel} = require('gulp');
const babel = require('gulp-babel');
const sass = require('gulp-sass');
const postCSS = require('gulp-postcss');
const purgeCSS = require('gulp-purgecss');
const autoPrefixer = require('autoprefixer');
const customProperties = require('postcss-custom-properties');
const easyImport = require('postcss-easy-import');
const cssNano = require('cssnano');
const rename = require('gulp-rename');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const browserSync = require('browser-sync').create();
const gulpZip = require('gulp-zip');

const paths = {
  style: {
    src: 'assets/scss/style.scss',
    dest: 'assets/built/css/'
  },
  script: {
    src: 'assets/js/custom.js',
    dest: 'assets/built/js/'
  }
};

const themeZip = require('./package.json').name + '.zip';
  
const handleError = (done) => {
    return function (err) {
        if (err) {
            beeper();
        }
        return done(err);
    };
};

function hbs_files(done) {
    pump([
        src(['*.html', '*.hbs', 'members/*.hbs', 'partials/**/*.hbs']),
        browserSync.stream()
    ], handleError(done));
}

function purge(done) {
    pump([
    src('assets/css/lib/*.css'),
    purgeCSS({
            content: ['*.html', '*.hbs', 'members/*.hbs', 'partials/**/*.hbs']
        }),
        dest('assets/built/css/lib'),
    ], handleError(done));
}

function styles(done) {
    pump([
        src(paths.style.src, {sourcemaps: true}),
        sass.sync().on('error', sass.logError),
        postCSS([
            easyImport,
            customProperties({preserve: false}),
            autoPrefixer({
              cascade: false
              }),
            cssNano()
        ]),
        rename({
          basename: 'main',
          suffix: '.min'
        }),
        dest(paths.style.dest, {sourcemaps: '.'}),
        browserSync.stream()
    ], handleError(done));
}

function scripts(done) {
    pump([
        src(paths.script.src, {sourcemaps: true}),
        babel({
            presets: ['@babel/env']
        }),
        concat('custom.js'),
        uglify(),
        dest(paths.script.dest, {sourcemaps: '.'}),
        browserSync.stream()
    ], handleError(done));
}

function zip(done) {
    pump([
        src(['**', '!node_modules', '!node_modules/**','!dist', '!dist/**']),
        gulpZip(themeZip),
        dest('dist/')
    ], handleError(done));
}

const styleWatcher = () => watch(['assets/scss/style.scss'], styles);
const jsWatcher = () => watch('assets/js/script.js', scripts);
const hbsWatcher = () => watch(['*.html', '*.hbs', 'members/*.hbs', 'partials/*.hbs'], hbs_files);
const purgeWatcher = () => watch(['*.html', '*.hbs', 'members/*.hbs', 'partials/**/*.hbs'], purge);
const browserLoad = () => browserSync.init({proxy: "http://localhost/"});
const watcher = parallel(purgeWatcher, styleWatcher, jsWatcher, hbsWatcher, browserLoad);
const build = series(purge, styles, scripts);

exports.styles = styles;
exports.purge = purge;
exports.scripts = scripts;
exports.build = build;
exports.zip = series(build, zip);
exports.default = series(build, watcher);
