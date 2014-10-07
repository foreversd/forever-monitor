/*
 * simple-test.js: Simple tests for using Monitor instances.
 *
 * (C) 2010 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var assert = require('assert'),
    path = require('path'),
    vows = require('vows'),
    fmonitor = require('../../lib'),
    macros = require('../helpers/macros');

var examplesDir = path.join(__dirname, '..', '..', 'examples');

vows.describe('forever-monitor/monitor/start-stop').addBatch({
  "When using forever-monitor": {
    "an instance of Monitor with valid options": {
      topic: new (fmonitor.Monitor)(path.join(examplesDir, 'server.js'), {
        max: 10,
        silent: true,
        options: ['-p', 8090],
        'logFile': './main.log',
        'outFile': './out.log',
        'errFile': './err.log'
      }),
      "should have correct properties set": function (child) {
        assert.isArray(child.args);
        assert.equal(child.max, 10);
        assert.isTrue(child.silent);
        assert.isFunction(child.start);
        assert.isObject(child.data);
        assert.isFunction(child.stop);
      },
      "calling the start() and stop() methods": {
        topic: function (child) {
          var that = this;
          timer = setTimeout(function () {
            that.callback(new Error('Child did not die when killed by forever'), child);
          }, 6000);
          
          process.on('uncaughtException', function(err) {
            console.log('Caught exception: ' + err);
          });

          setTimeout(function(){
            child.stop();
            setTimeout(function(){
              child.restart();
            }, 1000)
          }, 2000)

          child.start();
        },
        "should restart the child process": function (err, child) {
          assert.isNull(err)
          assert.isFalse(child.running)
        }
      }
    }
  }
}).export(module);
