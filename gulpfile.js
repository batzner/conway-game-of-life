const gulp = require('gulp');

// Include plug-ins
const eslint = require('gulp-eslint');
const clean = require('gulp-clean');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');
const htmlmin = require('gulp-htmlmin');
const minifyCSS = require('gulp-minify-css');
const minifyInline = require('gulp-minify-inline');

// Base for specifying paths in gulp.src and gulp.dest
const distDir = 'dist/';
const srcDir = 'src/';

// Paths to be used in gulp.src
const sourcePaths = {
    javascripts: ['js/**/*.js', '!js/lib/**/*.js'],
    images: ['img/**/*.png', 'img/**/*.jpg', 'img/**/*.jpeg', 'img/**/*.gif'],
    html: ['**/*.html'],
    css: ['css/**/*.css']
};

// Delete the dist directory
gulp.task('_clean', function () {
    return gulp.src(distDir)
        .pipe(clean());
});

// Copy all files
gulp.task('_copy', ['_clean'], function () {
    return gulp.src([srcDir + '**/*']).pipe(gulp.dest(distDir));
});

// Transpile the javascript files to ES5.
gulp.task('_javascripts', ['_copy'], function () {
    return gulp.src(sourcePaths.javascripts, {base: distDir, cwd: distDir})
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(uglify())
        .pipe(gulp.dest(distDir));
});

// Minify the images
gulp.task('_images', ['_copy'], function () {
    return gulp.src(sourcePaths.images, {base: distDir, cwd: distDir})
        .pipe(imagemin())
        .pipe(gulp.dest(distDir));
});

// Minify html
gulp.task('_html', ['_copy'], function () {
    return gulp.src(sourcePaths.html, {base: distDir, cwd: distDir})
        .pipe(htmlmin({
            collapseWhitespace: true,
            removeComments: true
        }))
        .pipe(minifyInline())
        .pipe(gulp.dest(distDir));
});

// Minify css
gulp.task('_css', ['_copy'], function () {
    return gulp.src(sourcePaths.css, {base: distDir, cwd: distDir})
        .pipe(minifyCSS())
        .pipe(gulp.dest(distDir));
});

// Default task producing a ready-to-ship frontend in the dist folder
gulp.task('default', ['_copy', '_javascripts', '_images', '_html', '_css']);

// Check code style on JS
gulp.task('eslint', function () {
    gulp.src(sourcePaths.javascripts, {cwd: srcDir})
        .pipe(eslint())
        .pipe(eslint.format());
});