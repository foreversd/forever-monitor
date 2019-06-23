var assert = require('assert')
    path = require('path'),
    vows = require('vows'),
    fmonitor = require('../../lib'),
    macros = require('../helpers/macros');

var examplesDir = path.join(__dirname, '..', '..', 'examples');

vows.describe('forever-monitor/plugins/logger').addBatch({
  'When using the cooldown plugin': {
    'running error-on-timer sample one hundred times': {
      topic: function () {
        var script = path.join(examplesDir, 'error-on-timer.js');
        var options = {
          max: 10,
          cooldownInterval: 1,
          silent: true,
          outFile: 'test/fixtures/stdout.log',
          errFile: 'test/fixtures/stderr.log',
          args: []
        }
        var child = new (fmonitor.Monitor)(script, options);
        setTimeout(this.callback.bind({}, null, child), 2100);
        child.start();
      },
      'should have not reached max': function (err, child) {
        assert.ok(child.times < 10);
      }
    },
    'running error-on-timer sample three times': macros.assertTimes(
      path.join(examplesDir, 'error-on-timer.js'),
      3,
      {
        cooldownInterval: 10,
        minUptime: 200,
        silent: true,
        outFile: 'test/fixtures/stdout.log',
        errFile: 'test/fixtures/stderr.log',
        args: []
      }
    )
  }
}).export(module);
