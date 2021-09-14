/*
 * monitor.js: Core functionality for the Monitor object.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const events = require('eventemitter2');
const spawn = child_process.spawn;
const common = require('./common');
const cluster = require('cluster');
const plugins = require('./plugins');
const utils = require('./utils');
const debug = require('./debug');
const util = require('util');

//
// ### function Monitor (script, options)
// #### @script {string} Location of the target script to run.
// #### @options {Object} Configuration for this instance.
// Creates a new instance of forever with specified `options`.
//
const Monitor = (exports.Monitor = function (script, options) {

  this.debug = debug(options.debug || {});

  //
  // Simple bootstrapper for attaching logger
  // and watch plugins by default. Other plugins
  // can be attached through `monitor.use(plugin, options)`.
  //
  function bootstrap(monitor) {

    const pluginPromises = [Promise.resolve()];
    pluginPromises.push(plugins.logger.attach.call(monitor, options));
    if (options.watch) {
      monitor.watch = true;
      pluginPromises.push(plugins.watch.attach.call(monitor, options));
    }

    return Promise.all(pluginPromises)
  }

  let execPath = process.execPath;
  const self = this;

  //
  // Setup basic configuration options
  //
  options = options || {};
  this.silent = options.silent || false;
  this.killTree = options.killTree !== false;
  this.uid = options.uid || utils.randomString(4);
  this.id = options.id || false;
  this.pidFile = options.pidFile;
  this.max = options.max;
  this.killTTL = options.killTTL;
  this.killSignal = options.killSignal || 'SIGKILL';
  this.childExists = false;
  this.checkFile = options.checkFile !== false;
  this.times = 0;
  this.warn = console.error;

  this.logFile = options.logFile;
  this.outFile = options.outFile;
  this.errFile = options.errFile;
  this.append = options.append;
  this.usePolling = options.usePolling;
  this.pollingInterval = options.pollingInterval;

  //
  // Define some safety checks for commands with spaces
  //
  this.parser = options.parser || Monitor.parseCommand;

  //
  // Setup restart timing. These options control how quickly forever restarts
  // a child process as well as when to kill a "spinning" process
  //
  this.minUptime =
    typeof options.minUptime !== 'number' ? 0 : options.minUptime;
  this.spinSleepTime = options.spinSleepTime || null;

  //
  // Special case Windows separately to decouple any
  // future changes
  //
  if (process.platform === 'win32') {
    execPath = '"' + execPath + '"';
  }

  if (options.options) {
    this.debug.warn('options.options is deprecated. Use options.args instead.');
  }

  //
  // Setup the command to spawn and the options to pass
  // to that command.
  //
  this.command = options.command || execPath;
  this.args = options.args || options.options || [];
  this.spawnWith = options.spawnWith || {};
  this.sourceDir = options.sourceDir;
  this.fork = options.fork || false;
  this.cwd = options.cwd || process.cwd();
  this.hideEnv = options.hideEnv || [];
  this._env = options.env || {};
  this._hideEnv = {};

  //
  // Allow for custom stdio configuration of forked processes
  //
  this.stdio = options.stdio || null;

  //
  // Setup watch configuration options
  //
  this.watchIgnoreDotFiles = options.watchIgnoreDotFiles !== false;
  this.watchIgnorePatterns = options.watchIgnorePatterns || [];
  this.watchDirectory = options.watchDirectory || this.sourceDir;

  //
  // Setup extra logger options
  //

  this.stdoutEventName = options.stdoutEventName || null;
  this.stderrEventName = options.stderrEventName || null;
  this.customStdout = options.customStdout || null;
  this.customStderr = options.customStderr || null;


  //
  // Inbuilt unevented startUp and Endscript
  //

  this.afterStart = options.afterStart || false;
  this.afterExit = options.afterExit || false;

  //
  // Create a simple mapping of `this.hideEnv` to an easily indexable
  // object
  //
  this.hideEnv.forEach(function (key) {
    self._hideEnv[key] = true;
  });

  if (Array.isArray(script)) {
    this.command = script[0];
    this.args = script.slice(1);
  } else {
    this.args.unshift(script);
  }

  if (this.sourceDir) {
    this.args[0] = path.join(this.sourceDir, this.args[0]);
  }

  //
  // Bootstrap this instance now that options
  // have been set
  //
  bootstrap(this);
});

// Inherit from events.EventEmitter
util.inherits(Monitor, events.EventEmitter2);

//
// ### function start ([restart])
// #### @restart {boolean} Value indicating whether this is a restart.
// Start the process that this instance is configured for
//
Monitor.prototype.start = function (restart) {
  const self = this;

  if (this.running && !restart) {
    process.nextTick(function () {
      const error = new Error('Cannot start process that is already running.');
      self.emit('error', error);
      self.debug.error(error);
    });
    return this;
  }

  const child = this.trySpawn();
  if (!child) {
    process.nextTick(function () {
      const error = new Error('Target script does not exist: ' + self.args[0]);
      self.emit('error', error);
      self.debug.error(error);
    });
    return this;
  }

  this.ctime = Date.now();
  this.child = child;
  this.running = true;
  this.isMaster = cluster.isMaster;

  process.nextTick(() => {
    this.debug.log("Starting up finished");
    self.emit(restart ? 'restart' : 'start', self, self.data);

    if (this.afterStart && typeof this.afterStart === 'function') {
      this.debug.log("Starting afterStart FN");
      this.afterStart(this);
    }

  });

  function onMessage(msg) {
    self.emit('message', msg);
  }

  // Re-emit messages from the child process
  this.child.on('message', onMessage);

  child.on('exit', function (code, signal) {
    self.debug.debug("Child exited")
    const spinning = Date.now() - self.ctime < self.minUptime;
    child.removeListener('message', onMessage);
    self.emit('exit:code', code, signal);

    function letChildDie() {
      self.debug.warn("Child closing");
      self.running = false;
      self.forceStop = false;
      self.forceRestart = false;
      self.emit('exit', self, spinning);
      if (self.afterExit && typeof self.afterExit === 'function') {
        self.afterExit();
      }
    }

    function restartChild() {
      self.debug.log("Child restarting")
      self.forceStop = false;
      self.forceRestart = false;
      process.nextTick(function () {
        self.start(true);
      });
    }

    self.times++;

    if (
      self.forceStop ||
      (self.times >= self.max && !self.forceRestart) ||
      (spinning && typeof self.spinSleepTime !== 'number' && !self.forceRestart)
    ) {
      letChildDie();
    } else if (spinning) {
      setTimeout(restartChild, self.spinSleepTime);
    } else {
      restartChild();
    }
  });

  return this;
};

//
// ### function trySpawn()
// Tries to spawn the target Forever child process. Depending on
// configuration, it checks the first argument of the options
// to see if the file exists. This is useful is you are
// trying to execute a script with an env: e.g. node myfile.js
//
Monitor.prototype.trySpawn = function () {
  const run = this.parser(this.command, this.args.slice());
  let stats;


  if (
    /[^\w]node(\.exe)?$/.test(run.command)
    && this.checkFile
    && !this.childExists
    && !/^--?[\w-]+$/.test(run.args[0])) {
    try {
      stats = fs.statSync(run.args[0]);
      this.childExists = true;
    } catch (ex) {
      this.debug.debug({
        command: run.command,
        args: run.args,
      });
      return false;
    }
  }

  this.spawnWith.cwd = this.spawnWith.cwd || this.cwd;
  this.spawnWith.env = this._getEnv();

  if (process.platform === 'win32') {
    this.spawnWith.detached = true;
  }

  if (this.stdio) {
    this.spawnWith.stdio = this.stdio;
  } else {
    if (this.fork) {
      this.spawnWith.stdio = ['pipe', 'pipe', 'pipe', 'ipc'];
    }
  }

  this.debug.debug("Spawning: ", {
    command: run.command,
    args: run.args,
  });
  return spawn(run.command, run.args, this.spawnWith);
};

//
// ### @data {Object}
// Responds with the appropriate information about
// this `Monitor` instance and it's associated child process.
//
Monitor.prototype.__defineGetter__('data', function () {
  const self = this;
  const childData = {
    ctime: this.ctime,
    command: this.command,
    file: this.args[0],
    foreverPid: process.pid,
    logFile: this.logFile,
    args: this.args.slice(1),
    pid: this.child ? this.child.pid : undefined,
    silent: this.silent,
    uid: this.uid,
    id: this.id,
    spawnWith: this.spawnWith,
    running: this.running,
    restarts: this.times,
    isMaster: this.isMaster,
  };

  ['pidFile', 'outFile', 'errFile', 'env', 'cwd'].forEach(function (key) {
    if (self[key]) {
      childData[key] = self[key];
    }
  });

  if (this.sourceDir) {
    childData.sourceDir = this.sourceDir;
    childData.file = childData.file.replace(this.sourceDir + '/', '');
  }

  this.childData = childData;
  return this.childData;

  //
  // Setup the forever process to listen to
  // SIGINT and SIGTERM events so that we can
  // clean up the *.pid file
  //
  // Remark: This should work, but the fd gets screwed up
  //         with the daemon process.
  //
  // process.on('SIGINT', function () {
  //   process.exit(0);
  // });
  //
  // process.on('SIGTERM', function () {
  //   process.exit(0);
  // });
  // process.on('exit', function () {
  //   fs.unlinkSync(childPath);
  // });
});

//
// ### function restart ()
// Restarts the target script associated with this instance.
//
Monitor.prototype.restart = function () {
  this.times = this.times || 0;
  this.forceRestart = true;
  this.debug.debug("Restarting");

  return !this.running ? this.start(true) : this.kill(false);
};

//
// ### function closeWatcher
// Probably not the wisest idea to run this directly.
// But in the idea of atomit testing this is better
//
Monitor.prototype.closeWatcher = function () {
  if (this.watch && this.watcherProcess) {
    return new Promise((r) => {
      this.debug.log("Closing watcher");
      this.watcherProcess.close().then(() => {
        this.emit("watch:closed");
        this.debug.log("Watcher closed");
        r();
      })
    })
  }
  return Promise.resolve();

}

//
// ### function stop ()
// Stops the target script associated with this instance. Prevents it from auto-respawning
// Returns a promise
//
Monitor.prototype.stop = function () {
  this.debug.warn("Stopping forever");
  return this.closeWatcher().then(() => {
    return this.kill(true);
  });
};

//
// ### function kill (forceStop)
// #### @forceStop {boolean} Value indicating whether short circuit forever auto-restart.
// Kills the ChildProcess object associated with this instance.
//
Monitor.prototype.kill = function (forceStop) {
  const child = this.child,
    self = this;
  let timer;

  if (!child || (!this.running && !this.forceRestart)) {
    process.nextTick(function () {
      const error = new Error('Cannot stop process that is not running.');
      self.emit('error', error);
      self.debug.error(error);
    });
  } else {
    //
    // Set an instance variable here to indicate this
    // stoppage is forced so that when `child.on('exit', ..)`
    // fires in `Monitor.prototype.start` we can short circuit
    // and prevent auto-restart
    //
    if (forceStop) {
      self.debug.warn("Force stopping");
      this.forceStop = true;
      //
      // If we have a time before we truly kill forcefully, set up a timer
      //
      if (this.killTTL) {
        timer = setTimeout(function () {
          common.kill(
            self.child.pid,
            self.killTree,
            self.killSignal || 'SIGKILL'
          );
        }, this.killTTL);

        child.once('exit', function () {
          clearTimeout(timer);
        });
      }
    }

    child.once('exit', function () {
      self.emit('stop', self.childData);
      if (self.forceRestart && !self.running) {
        self.start(true);
      }
    });

    common.kill(this.child.pid, this.killTree, this.killSignal);
  }

  return this;
};

//
// ### function send ()
// Sends a message to a forked ChildProcess object associated with this instance.
// see http://nodejs.org/api/child_process.html#child_process_child_send_message_sendhandle
//
Monitor.prototype.send = function (msg) {
  const child = this.child,
    self = this;

  self.debug.debug("Sending: ", msg);

  if (!child || !this.running) {
    process.nextTick(function () {
      const error = new Error('Cannot send to process that is not running.')
      self.emit('error', error);
      self.debug.error(error);
    });
  }

  if (child.send) {
    child.send(msg);
  }
};

//
// ### function toString ()
// Override default toString behavior and just respond
// with JSON for this instance.
//
Monitor.prototype.toString = function () {
  return JSON.stringify(this);
};

//
// ### function inspect ()
// Set this to null so that `util.inspect` does not
// return `undefined`.'
//
Monitor.prototype.inspect = null;

//
// ### @private function _getEnv ()
// Returns the environment variables that should be passed along
// to the target process spawned by this instance.
//
Monitor.prototype._getEnv = function () {
  const self = this,
    merged = {};

  function addKey(key, source) {
    merged[key] = source[key];
  }

  //
  // Mixin the key:value pairs from `process.env` and the custom
  // environment variables in `this._env`.
  //
  Object.keys(process.env).forEach(function (key) {
    if (!self._hideEnv[key]) {
      addKey(key, process.env);
    }
  });

  Object.keys(this._env).forEach(function (key) {
    addKey(key, self._env);
  });

  return merged;
};

//
// ### function parseCommand (command, args)
// #### @command {String} Command string to parse
// #### @args    {Array}  Additional default arguments
//
// Returns the `command` and the `args` parsed
// from the command depending on the Platform.
//
Monitor.parseCommand = function (command, args) {
  const match = command.match(
    process.platform === 'win32' ? safetyChecks.windows : safetyChecks.linux
  );

  //
  // No match means it's a bad command. This is configurable
  // by passing a custom `parser` function into the `Monitor`
  // constructor function.
  //
  if (!match) {
    return false;
  }

  if (process.platform == 'win32') {
    command = match[1];
    if (match[9]) {
      args = match[9].split(' ').map((v) => v.trim()).filter(Boolean).concat(args);
    }
  } else {
    command = match[1];
    if (match[2]) {
      args = match[2].split(' ').map((v) => v.trim()).filter(Boolean).concat(args);
    }
  }


  return {
    command,
    args,
  };
};

//
// ### @private {Object} safetyChecks
// Define default safety checks for commands
// with spaces in Windows & Linux
//
const safetyChecks = {
  windows: /(((([A-Z]:\\)|(\.\.\\))(([\w\s\.-])+\\)*)?[\w]+(\.[\w]+)?)((\s[\w-]+)*)/,
  linux: /(.*?[^\\])(?: (.*)|$)/,
};
