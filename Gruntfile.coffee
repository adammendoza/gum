#  Gruntfile

module.exports = (grunt) ->
  grunt.initConfig
    js2jade:
      files:
        src:["src/mint.js"]
        dest:"dist/mint.jade"
    copy:
      jade: files: [
        expand: true
        cwd: "src/"
        src: ["*.jade"]
        dest: "dist/"
      ]
    watch:
      options:
        livereload: true

      js2jade:
        files: ["src/*.js"]
        tasks: ["js2jade", "samples"]

      jade:
        files: ["src/*.jade"]
        tasks: ["copy:jade", "samples"]

  require("load-grunt-tasks") grunt
  grunt.registerTask "build", ["js2jade", "copy:jade"]
  grunt.registerTask "default", ["build", "samples", "watch"]

  grunt.registerTask "samples", ->
   #
   #  Edit samples config in package.json
   #
    samples = grunt.file.readJSON("package.json").samples
    return unless samples.enabled
    grunt.config "jade",
      samples: files: [
        expand: true
        cwd: samples.path
        src: ["*.jade"]
        dest: samples.local
        ext: ".php"
      ]
    grunt.config.merge
      watch:
        files: [samples.path + "*.jade"]
        tasks: ["samples"]

    grunt.task.run "jade"
    grunt.log.writeln "Building samples in " + samples.local.cyan