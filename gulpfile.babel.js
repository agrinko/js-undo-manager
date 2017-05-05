import gulp from "gulp";
import babel from "gulp-babel";
import uglify from "gulp-uglify";
import rename from "gulp-rename";

gulp.task("default", ["build"]);

gulp.task("build", ["babel"], () => {
    return gulp.src([
            "src/*.js",
            "!src/*.min.js"
        ])
        .pipe(uglify({
            preserveComments: "license"
        }))
        .pipe(rename({
            suffix: ".min"
        }))
        .pipe(gulp.dest("src"));
});

gulp.task("babel", () => {
    return gulp.src("src/*.es6")
        .pipe(babel())
        .pipe(gulp.dest("src"));
});
