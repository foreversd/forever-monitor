/*
 * ignore-clean-exit-test.js: Tests for spin restarts in forever.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    fmonitor = require('../../lib');

vows.describe('forever-monitor/monitor/ignore-clean-exit').addBatch({
  "When using forever-monitor": {
    "and spawning a script that exits gracefully": {
      "with ignoreCleanExit enabled": {
        topic: function () {
          var script = path.join(__dirname, '..', '..', 'examples', 'graceful-exit-automatically.js'),
            child = new (fmonitor.Monitor)(script, { ignoreCleanExit: true });
  
          child.on('exit', this.callback);
          child.start();        
        },
        "should not restart script": function (child, spinning) {
          assert.isFalse(child.running);
        },
      },
      "with a ignoreCleanExit disabled": {
        topic: function () {
          var script = path.join(__dirname, '..', '..', 'examples', 'graceful-exit-automatically.js'),
            child = new (fmonitor.Monitor)(script, { ignoreCleanExit: false });
  
          child.on('start', this.callback);
          child.start();
        },
        "should restart script": function (child, data) {
          assert.isTrue(child.running);
        }
      }
    },
    "and spawning a script that exits with uncaughtException": {
      "with a ignoreCleanExit enabled": {
        topic: function () {
          var script = path.join(__dirname, '..', '..', 'examples', 'always-throw.js'),
            child = new (fmonitor.Monitor)(script, { ignoreCleanExit: true, silent: true });
  
          child.on('start', this.callback);
          child.start();
        },
        "should restart script": function (child, data) {
          assert.isTrue(child.running);
        }
      }      
    }
  }
}).export(module);
