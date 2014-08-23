#  Gruntfile

module.exports = (grunt) ->

  require("load-grunt-tasks") grunt;

  grunt.registerTask "build", ["js2jade", "copy"]
  samples = buildSamples grunt, "samples"
  grunt.registerTask "default", ["build", samples, "watch"]

  grunt.initConfig
    js2jade:
        files:
          src:["src/cherry.js", "src/plum.js"]
          dest:"dist/gum.jade"
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
        tasks: ["js2jade"]

      jade:
        files: ["src/*.jade"]
        tasks: ["copy:jade"]

      samples:
        files: ["samples/*.jade"]
        tasks: [samples]
#
#  Adds @task to the grunt config object. Edit the JSON
#  package to enable building the samples.
#
#  "samples": {
#     "enabled": true,
#     "root": "path/to/www"
#   },
#
#  @grunt Grunt object.
#  @task  Name of the task.
#
buildSamples = (grunt, task) ->
  pkg = grunt.file.readJSON "package.json"
  enabled = pkg.samples.enabled
  root = pkg.samples.root

  grunt.task.registerTask task, ->
    if enabled and root != ""
      grunt.config "jade",
        samples: files: [
          expand: true
          cwd: "samples/"
          src: ["*.jade"]
          dest: root + "/gum/"
          ext: ".php"
        ]
      grunt.task.run "jade"
      message = "Building Gum Samples"

    if !root
      message = "Add the www root to your JSON package to enable samples."

    if !enabled # This message takes priority over the last one.
      message = "Edit your JSON package to enable samples."

    grunt.log.writeln message.cyan

  return task