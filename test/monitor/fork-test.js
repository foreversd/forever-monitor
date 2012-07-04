/*
 * spin-test.js: Tests for spin restarts in forever-monitor.
 *
 * (C) 2010 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    fmonitor = require('../../lib');

vows.describe('forever-monitor/monitor/fork').addBatch({
  "When using forever-monitor": {
    "and spawning a script that uses `process.send()`": {
      "using the 'native' fork": {
        topic: function () {
          var script = path.join(__dirname, '..', '..', 'examples', 'process-send.js'),
              child = new (fmonitor.Monitor)(script, { silent: false, minUptime: 2000, max: 1, fork: true });

          child.on('message', this.callback.bind(null, null));
          child.start();
        },
        "should reemit the message correctly": function (err, msg) {
          assert.isObject(msg);
          assert.deepEqual(msg, { from: 'child' });
        }
      }
    }
  }
}).export(module);
