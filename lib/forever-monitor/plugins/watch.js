/*
 * watch.js: Plugin for `Monitor` instances which adds file watching.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

const fs = require('fs'),
  path = require('path'),
  minimatch = require('minimatch'),
  chokidar = require('chokidar');

exports.name = 'watch';

//
// ### @private function _watchFilter
// #### @file {string} File name
// Determines whether we should restart if `file` change (@mikeal's filtering
// is pretty messed up).
//
function watchFilter(fileName) {
  let watchDirectory = this.watchDirectory, //this is array if multiple --watchDirectory options given, treat as array always
    result = true;

  if (!Array.isArray(watchDirectory)) {
    watchDirectory = [watchDirectory];
  }

  watchDirectory.forEach(
    function (directory) {
      const relFileName = path.relative(directory, fileName),
        length = this.watchIgnorePatterns.length;
      let testName, i;

      if (this.watchIgnoreDotFiles && path.basename(fileName)[0] === '.') {
        result = false;
      }

      for (i = 0; i < length; i++) {
        if (this.watchIgnorePatterns[i].length > 0) {
          testName =
            this.watchIgnorePatterns[i].charAt(0) !== '/'
              ? relFileName
              : fileName;
          if (
            minimatch(testName, this.watchIgnorePatterns[i], {
              matchBase: directory,
            })
          ) {
            result = false;
          }
        }
      }
    }.bind(this)
  );

  return result;
}

//
// ### function attach (options)
// #### @options {Object} Options for attaching to `Monitor`
//
// Attaches functionality for logging stdout and stderr to `Monitor` instances.
//
exports.attach = function () {
  let watchDirectory = this.watchDirectory;
  const //this.watchDirectory is array if multiple --watchDirectory options given, treat as array always
    monitor = this;

  if (!Array.isArray(watchDirectory)) {
    watchDirectory = [watchDirectory];
  }

  
  Promise.all(watchDirectory.map(function (directory) {
    return new Promise((rs,rej) => {
      fs.readFile(path.join(directory, '.foreverignore'), 'utf8', function (
        err,
        data
      ) {
        if (err) {
          monitor.emit('watch:error', {
            message: 'Could not read .foreverignore file.',
            error: err.message,
          });
          rs();
          return;
        }

        Array.prototype.push.apply(
          monitor.watchIgnorePatterns,
          data.split('\n').filter(Boolean)
        );  
        rs();
      });
    })
  }))
  .then(() => {
    monitor.debug.debug(
      {watchIgnorePatterns: monitor.watchIgnorePatterns}
    );
    const opts = {
      usePolling: this.usePolling,
      interval: this.pollingInterval,
      ignoreInitial: true,
      ignored: function (fileName) {
        return !watchFilter.call(monitor, fileName);
      },
    };

    monitor.emit('watch:started');
  
    // Or, ignore: function(fileName) { return !watchFilter(fileName) }
    monitor.watcherProcess = chokidar.watch(this.watchDirectory, opts).on('all', function (event, f, stat) {
      monitor.emit('watch:restart', { file: f, stat: stat });
      monitor.restart();
    });
  })

};
