/*
 * logger.js: Plugin for `Monitor` instances which adds stdout and stderr logging.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

const fs = require('fs');

//
// Name the plugin
//
exports.name = 'logger';

//
// ### function attach (options)
// #### @options {Object} Options for attaching to `Monitor`
//
// Attaches functionality for logging stdout and stderr to `Monitor` instances.
//
exports.attach = function(options) {
  options = options || {};
  const monitor = this;

  if (options.outFile) {
    monitor.stdout =
      options.stdout ||
      fs.createWriteStream(options.outFile, {
        flags: monitor.append ? 'a+' : 'w+',
        encoding: 'utf8',
        mode: 0644,
      });
  }

  if (options.errFile) {
    monitor.stderr =
      options.stderr ||
      fs.createWriteStream(options.errFile, {
        flags: monitor.append ? 'a+' : 'w+',
        encoding: 'utf8',
        mode: 0644,
      });
  }

  monitor.on('start', startLogs);
  monitor.on('restart', startLogs);
  monitor.on('exit', stopLogs);

  function stopLogs() {
    if (monitor.stdout) {
      //
      // Remark: 0.8.x doesnt have an unpipe method
      //
      monitor.child.stdout.unpipe &&
        monitor.child.stdout.unpipe(monitor.stdout);
      monitor.stdout.destroy();
      monitor.stdout = null;
    }
    //
    // Remark: 0.8.x doesnt have an unpipe method
    //
    if (monitor.stderr) {
      monitor.child.stderr.unpipe &&
        monitor.child.stderr.unpipe(monitor.stderr);
      monitor.stderr.destroy();
      monitor.stderr = null;
    }
  }

  function startLogs(_child, _childData) {
    if (monitor.child) {
      monitor.child.stdout.on('data', function onStdout(data) {
        monitor.emit('stdout', data);
      });

      monitor.child.stderr.on('data', function onStderr(data) {
        monitor.emit('stderr', data);
      });

      if (!monitor.silent) {
        process.stdout.setMaxListeners(0);
        process.stderr.setMaxListeners(0);
        monitor.child.stdout.pipe(process.stdout, { end: false });
        monitor.child.stderr.pipe(process.stderr, { end: false });
      }

      if (monitor.stdout) {
        monitor.child.stdout.pipe(monitor.stdout, { end: false });
      }

      if (monitor.stderr) {
        monitor.child.stderr.pipe(monitor.stderr, { end: false });
      }
    }
  }
};
