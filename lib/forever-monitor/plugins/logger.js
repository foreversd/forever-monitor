/*
 * logger.js: Plugin for `Monitor` instances which adds stdout and stderr logging.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

var fs = require('fs'),
    winston = require('winston'),
    winstonStream = require('winston-stream');

//
// Name the plugin
//
exports.name = 'logger';

//
// ### @private function (file, level, options)
// #### @file {string} log filename
// #### @options {Object} Options for attaching to `Monitor`
// Helper function that sets up a winston logger to the specified file.
// We use the options to see if a logrotation is needed
//
function getWinstonLogger(file, options) {

  var trasnportOptions = {
    name: 'log',
    filename: file,
    options: {flags: options.append ? 'a+' : 'w+', encoding: 'utf8', mode: 0644},
    json: false,
    timestamp: true
  };

  if(options.tailable){
      // LOG ROTATION OPTIONS
      // log rotation for the logFile will not work if the spawner of this process (forever)
      // has provided a file descriptor for stdout and stderr
      // those values must be setted to 'ignore'
      trasnportOptions.tailable      = options.tailable;
      trasnportOptions.maxsize       = options.maxsize;
      trasnportOptions.maxFiles      = options.maxFiles;
      trasnportOptions.zippedArchive = options.zippedArchive;
  }

  return new (winston.Logger)({
    transports: [
      new (winston.transports.File)(trasnportOptions)
    ]
  });
}

//
// ### function attach (options)
// #### @options {Object} Options for attaching to `Monitor`
//
// Attaches functionality for logging stdout and stderr to `Monitor` instances.
//
exports.attach = function (options) {
  options = options || {};
  var monitor = this;

  if (options.outFile) {
    monitor.stdout = options.stdout || winstonStream(getWinstonLogger(options.outFile, options), "info");
  }

  if (options.errFile) {
    monitor.stderr = options.stderr || winstonStream(getWinstonLogger(options.errFile, options), "error");
  }
    
  if (options.logFile) {
    // Create the main forever logFile logger
    var logFileStream = getWinstonLogger(options.logFile, options);
    monitor.stdlogout = options.stdlogout || winstonStream(logFileStream, "info");
    monitor.stdlogerr = options.stdlogerr || winstonStream(logFileStream, "error");
  }
    
  monitor.on('start', startLogs);
  monitor.on('restart', startLogs);
  monitor.on('exit', stopLogs);

  function stopLogs() {
    if (monitor.stdout) {
      //
      // Remark: 0.8.x doesnt have an unpipe method
      //
      monitor.child.stdout.unpipe && monitor.child.stdout.unpipe(monitor.stdout);
      monitor.stdout._logger.remove("log");
      monitor.stdout = null;
    }
    
    if (monitor.stderr) {
      //
      // Remark: 0.8.x doesnt have an unpipe method
      //
      monitor.child.stderr.unpipe && monitor.child.stderr.unpipe(monitor.stderr);
      monitor.stderr._logger.remove("log");
      monitor.stderr = null;
    }
    
    if (monitor.stdlogout && monitor.stdlogerr) {
      monitor.child.stdout.unpipe && monitor.child.stdout.unpipe(monitor.stdlogout);
      monitor.child.stderr.unpipe && monitor.child.stderr.unpipe(monitor.stdlogerr);
    
      logFileStream.remove("log");
    
      monitor.stdlogout = null;
      monitor.stdlogerr = null;
    }
  }

  function startLogs(child, childData) {
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
      
      if (monitor.stdlogout && monitor.stdlogerr) {
        monitor.child.stdout.pipe(monitor.stdlogout, { end: false });
        monitor.child.stderr.pipe(monitor.stdlogerr, { end: false });
      }
    }
  }
};


