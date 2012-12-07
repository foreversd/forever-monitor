/*
 * logger.js: Plugin for `Monitor` instances which adds stdout and stderr logging, plus
 * automatic log rotation
 *
 * (C) 2010 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var fs = require('fs'),
    strftime = require('strftime'),    // for creating date-formatted file names
	flogger = require('forever').log;  // for logging to interal process

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
exports.attach = function (options) {
  options = options || {};
  var monitor = this;
  if (!options.rotateCheck) options.rotateCheck = 30000   // how often do we check to see if logs 
                                                                // should be rotated

  // fileUse holds the names of the files actually being written to; the user, if
  // they want roration, will send a strftime template as the file argument.
  monitor.fileUse = new Object;
  // streams are for the stderr, stdout steams.  Consolidating into a single object
  // makes code resuse easy and readability clear
  monitor.streams = new Object;

  // track base name of files; in the case of log rotation we will use these as
  // strings against which a strftime regex will be performed.  Otherwise we will
  // treat these as regular file names.
  monitor.fileBase = {
    'stdout': options.outFile,
    'stderr': options.errFile
  };

  // for each file, if defined set up the real file to use.
  for (var type in monitor.fileBase) {
    if (monitor.fileBase[type]) {
	  // If this is a strftime template the user wants log rotation; do the string
	  // substitution to create time based file, then set a timeout to check if we
	  // need to rotate
	  if (monitor.fileBase[type].match(/\%/)) {
	    monitor.fileUse[type] = strftime(monitor.fileBase[type]);
	    setTimeout(function(){ doesLogFileNeedRotation(type) }, options.rotateCheck);    
	  }
	  // otherwise it's a plan old log file
	  else {
	    monitor.fileUse[type] = monitor.fileBase[type];
	  }
	  newFileStream(type, true);
    }
  }

  monitor.on('start', startLogs);
  monitor.on('restart', startLogs);
  monitor.on('exit', function () { 
    for (type in monitor.fileBase) {
      if (monitor.streams[type]) {
        monitor.streams[type].destroySoon();
	  }
    }
  });

  // Set up the stream to write to
  function newFileStream(type, init_only) {
	flogger.info("Opening " + monitor.fileUse[type] + " for " + type);
	monitor.streams[type] = fs.createWriteStream(monitor.fileUse[type], {
      flags: monitor.append ? 'a+' : 'w+',
      encoding: 'utf8',
      mode: 0644
    });
	monitor.streams[type].on('close', function() { newFileStream(type) });
    if (!init_only) rotateLogs()  // when we are setting up the logs initially
	                             // startLogs needs to happen on the monitor event
							 	 // "start"
  };

  // Check to see if we need a new file; the test is based on the strftime template
  // submitted by the user.  If the file name is different from the current file name,
  // rotate.
  function doesLogFileNeedRotation(type) {
    for (var type in monitor.fileBase) {
	  var newFileUse = strftime(monitor.fileBase[type]);
      if (newFileUse != monitor.fileUse[type]) {
	    flogger.info("Log rotation: moving " + type + " output to " + newFileUse);
	    monitor.fileUse[type] = newFileUse;
	    monitor.streams[type].end(); 
      }
	}
  	setTimeout(function() { doesLogFileNeedRotation(type) }, options.rotateCheck);
  }

  function rotateLogs() {
    for (var type in monitor.fileBase) {
      if (monitor.streams[type]) {
        var paused = false; // would be nice if a stream had a public method exposed for letting
		                    // you know what state it was in
							  
	    // with log roation we need to have a smooth handoff; pause an existing stream
        if (monitor.child[type]) {
		  monitor.child[type].pause();
          paused = true;
		}
        monitor.child[type].pipe(monitor.streams[type], { end: false });
		if (paused == true) {
		  monitor.child[type].resume();
          paused = false;
        }
      }
    }
  }

  function startLogs() {
    if (monitor.child) {
      monitor.child.stdout.on('data', function onStdout(data) {
        monitor.emit('stdout', data);
      });

      monitor.child.stderr.on('data', function onStderr(data) {
        monitor.emit('stderr', data);
      });

      if (!monitor.silent) {
        monitor.child.stdout.pipe(process.stdout, { end: false });
        monitor.child.stderr.pipe(process.stderr, { end: false });
      }

      for (var type in monitor.fileBase) {
        if (monitor.streams[type]) {
          monitor.child[type].pipe(monitor.streams[type], { end: false });
        }
	  }
    }
  }
};


