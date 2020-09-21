const gulp = require("gulp");
const gulpLoadPlugins = require("gulp-load-plugins");
const del = require("del");
const wiredep = require("wiredep").stream;
const uglify = require('gulp-uglify-es').default;

const $ = gulpLoadPlugins();

gulp.task("extras", () => {
  return gulp
    .src(
      [
        "extension/*.*",
        "extension/_locales/**",
        "!extension/scripts.babel",
        "!extension/*.json",
        "!extension/*.html",
      ],
      {
        base: "extension",
        dot: true,
      }
    )
    .pipe(gulp.dest("extension-dist"));
});

function lint(files, options) {
  return () => {
    return gulp.src(files).pipe($.eslint(options)).pipe($.eslint.format());
  };
}

gulp.task(
  "lint",
  lint("extension/scripts.babel/**/*.js", {
    env: {
      es6: true,
    },
  })
);

gulp.task("images", () => {
  return gulp
    .src("extension/images/**/*")
    .pipe(
      $.if(
        $.if.isFile,
        $.cache(
          $.imagemin({
            progressive: true,
            interlaced: true,
            // don't remove IDs from SVGs, they are often used
            // as hooks for embedding and styling
            svgoPlugins: [{ cleanupIDs: false }],
          })
        ).on("error", function (err) {
          console.log(err);
          this.end();
        })
      )
    )
    .pipe(gulp.dest("extension-dist/images"));
});

gulp.task("html", () => {
  return gulp
    .src("extension/*.html")
    .pipe($.useref({ searchPath: [".tmp", "extension", "."] }))
    .pipe($.sourcemaps.init())
    .pipe($.if("*.js", uglify()))
    .pipe($.if("*.css", $.cleanCss({ compatibility: "*" })))
    .pipe($.sourcemaps.write())
    .pipe(
      $.if(
        "*.html",
        $.htmlmin({
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
          removeComments: true,
        })
      )
    )
    .pipe(gulp.dest("extension-dist"));
});

gulp.task("chromeManifest", () => {
  return gulp
    .src("extension/manifest.json")
    .pipe(
      $.chromeManifest({
        buildnumber: true,
        background: {
          target: "scripts/background.js",
          exclude: ["scripts/chromereload.js"],
        },
      })
    )
    .pipe($.if("*.css", $.cleanCss({ compatibility: "*" })))
    .pipe($.if("*.js", $.sourcemaps.init()))
    .pipe($.if("*.js", uglify()))
    .pipe($.if("*.js", $.sourcemaps.write(".")))
    .pipe(gulp.dest("extension-dist"));
});

gulp.task("babel", () => {
  return gulp
    .src("extension/scripts.babel/**/*.js", {
      ignore: [],
    })
    .pipe(
      $.babel({
        //presets: ["es2015"],
        ignore: ["extension/scripts.babel/*.min.js"],
      })
    )
    .pipe(gulp.dest("extension/scripts"));
});

gulp.task("clean", del.bind(null, [".tmp", "extension-dist"]));

gulp.task(
  "watch",
  gulp.series("lint", "babel", () => {
    $.livereload.listen();
    gulp
      .watch([
        "extension/*.html",
        "extension/scripts/**/*.js",
        "extension/images/**/*",
        "extension/styles/**/*",
        "extension/_locales/**/*.json",
      ])
      .on("change", $.livereload.reload);

    gulp.watch("extension/scripts.babel/**/*.js", gulp.series("lint", "babel"));
    gulp.watch("bower.json", gulp.series("wiredep"));
  })
);

gulp.task("size", () => {
  return gulp.src("extension-dist/**/*").pipe($.size({ title: "build", gzip: true }));
});

gulp.task("wiredep", () => {
  gulp
    .src("extension/*.html")
    .pipe(
      wiredep({
        ignorePath: /^(\.\.\/)*\.\./,
      })
    )
    .pipe(gulp.dest("extension"));
});

gulp.task("package", function () {
  var manifest = require("./extension-dist/manifest.json");
  return gulp
    .src("extension-dist/**")
    .pipe($.zip("BCM-" + manifest.version + ".zip"))
    .pipe(gulp.dest("package"));
});

gulp.task(
  "build",
  gulp.series(
    "lint",
    "babel",
    "chromeManifest",
    ["html", "images", "extras"],
    "size"
  )
);

gulp.task("default", gulp.series("clean", "build"));
