const { src, dest, parallel, series, watch } = require('gulp')
const del = require('del')
const sass = require('gulp-sass')(require('sass'))
const sassGlob = require('gulp-sass-glob');
const autoprefixer = require('gulp-autoprefixer')
const gcssmq = require('gulp-group-css-media-queries')
const includeFiles = require('gulp-include')
const browserSync = require('browser-sync').create()
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function browsersync() {
    browserSync.init({
        server: {
            baseDir: './public/',
            serveStaticOptions: {
                extensions: ['html'],
            },
        },
        port: 8080,
        ui: { port: 8081 },
        open: true,
    })
}

function generateBarrel(cb) {
    const componentsDir = './src/styles/components';
    const pattern = path.join(componentsDir, '**', '_*.scss');
    const files = glob.sync(pattern);
    const forwards = files.map(f => {
        const rel = path.relative(componentsDir, f).replace(/\.scss$/, '');
        return `@use "components/${rel}";`;
    });

    const header = `@use "abstracts/index" as *;\n@use "base/index" as *;\n@use "layout/grid";\n\n`

    const content = header + forwards.join('\n');

    fs.writeFileSync(path.join('./src/styles/', 'main.scss'), content);
    cb();
}

function styles() {
    return src('./src/styles/main.scss')
        .pipe(sassGlob())
        .pipe(
            sass({
                includePaths: ['./src/styles'],
                quietDeps: true,
                logger: {
                    warn: () => { },
                },
            }).on('error', sass.logError)
        )
        .pipe(autoprefixer({ grid: true }))
        .pipe(gcssmq())
        .pipe(cleanCSS({ level: { 1: { specialComments: 0 } } }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(dest('./public/css/'))
        .pipe(browserSync.stream())
}

function scripts() {
    return src('./src/js/script.js')
        .pipe(
            includeFiles({
                includePaths: './src/components/**/',
            })
        )
        .pipe(dest('./public/js/'))
        .pipe(browserSync.stream())
}

function pages() {
    return src('./src/pages/*.html')
        .pipe(
            includeFiles({
                includePaths: './src/components/**/',
            })
        )
        .pipe(dest('./public/'))
        .pipe(browserSync.reload({ stream: true, }))
}

function copyFonts() {
    return src('./src/fonts/**/*')
        .pipe(dest('./public/fonts/'))
}

function copyImages() {
    return src('./src/images/**/*')
        .pipe(dest('./public/images/'))
}

async function copyResources() {
    copyFonts()
    copyImages()
}

async function clean() {
    return del.sync('./public/', { force: true })
}

function watch_dev() {
    watch(['./src/js/script.js', './src/js/**/*.js'], scripts)
    watch(['./src/styles/main.scss', './src/styles/**/*.scss'], styles).on(
        'change',
        browserSync.reload
    )
    watch(['./src/pages/*.html'], pages).on(
        'change',
        browserSync.reload
    )
    watch(['./src/images/*.*'], copyImages).on(
        'change',
        browserSync.reload
    )
    watch(['./src/styles/components/*.scss'], generateBarrel).on(
        'change',
        browserSync.reload
    )
}

exports.browsersync = browsersync
exports.clean = clean
exports.scripts = scripts
exports.styles = styles
exports.pages = pages
exports.copyResources = copyResources
exports.generateBarrel = generateBarrel

exports.default = parallel(
    generateBarrel,
    clean,
    styles,
    scripts,
    copyResources,
    pages,
    browsersync,
    watch_dev
)

exports.build = series(
    generateBarrel,
    clean,
    styles,
    scripts,
    copyResources,
    pages
)


