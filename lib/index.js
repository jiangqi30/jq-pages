/*
 * @Descripttion: Part2-1作业：Gulp 完成项目的自动化构建
 * @version: 0.1
 * @Author: JiangQi
 * @Date: 2021-06-23 08:59:10
 * @LastEditors: JiangQi
 * @LastEditTime: 2021-08-09 15:51:16
 */

// 实现这个项目的构建任务
const { src, dest, parallel, series, watch } = require('gulp')

const del = require('del')  // 用来删除指定文件
const browserSync = require('browser-sync') // 用来创建开发服务器
const bs = browserSync.create()

const loadPlugins = require('gulp-load-plugins')  // 用来统一加载 gulp 插件
const plugins = loadPlugins()

const sass = require('gulp-sass')(require('sass')) // 用来转化 scss 文件为 css
// const babel = require('gulp-babel') // 用来转化 JS 文件
// const swig = require('gulp-swig') // 用来转化 html 模板
// const imagemin = require('gulp-imagemin') // 用来转化图片文件
const path = require('path')
const cwd = process.cwd()
let config = {
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}
try {
  // const loadConfig = require(`${cwd}/pages.config.js`)
  const loadConfig = require(path.join(cwd, 'pages.config.js'))
  config = Object.assign({}, config, loadConfig)
} catch (e) {}

// 清除指定文件任务
const clean = () => {
  return del([config.build.dist, config.build.temp])
}
// 样式编译任务
const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src }) // base: 基准路径，可以保留拷贝前的目录结构
    .pipe(sass())
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}
// JS 脚本编译任务
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}
// html 页面模板编译任务
const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data }))  // 编译模板并传递模板参数
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}
// 图片文件转换任务
const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}
// 字体文件转换任务
const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}
// public 其他文件处理任务
const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}
// 开发服务器任务
const serve = () => {
  // 监听文件变化，执行对应的任务
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)
  // watch('src/assets/images/**', image)
  // watch('src/assets/fonts/**', font)
  // watch('public/**', extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)
  watch('**', { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 9527,
    // open: false,
    // files: 'dist/**',  // 监听文件刷新页面
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}
// 引用处理、压缩文件任务
const useref = () => {
  return src(config.build.pages, { base: config.build.dist, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))  // 引用处理
    .pipe(plugins.if(/\.js$/, plugins.uglify()))  // 压缩 JS
    .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // 压缩 CSS
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({ // 压缩 html
      collapseWhitespace: true, // 压缩 html 中空白字符
      minifyCSS: true,  // 压缩 html 中的 css
      minifyJS: true  // 压缩 html 中的 js
    })))
    .pipe(dest(config.build.dist))
}
// 组合任务： html、scss、js 文件转化
const compile = parallel(style, script, page)
// 生产环境打包任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)
// 开发环境任务
const dev = series(compile, serve)

module.exports = {
  clean,
  build,
  dev
}