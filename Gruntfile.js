'use strict';
module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  // Define the configuration for all the tasks
  grunt.initConfig({
    // Watches files for changes and runs tasks based on the changed files
    watch: {
      livereload: {
        options: {
          livereload: '<%= connect.livereload.options.livereload %>'
        },
        files: [
          'www/**'
        ]
      }
    },

    connect: {
      options: {
        hostname: '127.0.0.1'
      },
      livereload: {
        options: {
          port: '9080',
          livereload: '35700',
          open: true,
          base: [
            'www'
          ]
        }
      }
    }
  });


  grunt.registerTask('serve', function (target) {
    grunt.task.run([
      'connect:livereload',
      'watch'
    ]);
  });


  grunt.registerTask('default', ['serve']);
};
