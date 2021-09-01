

const assert = require('assert'),
  path = require('path'),
  fs = require('fs'),
  vows = require('vows'),
  fmonitor = require('../../lib');

const watchDir = fs.realpathSync(
  path.join(__dirname, '..', 'fixtures', 'watch')
);

const getMonitor = function () {
  return fmonitor.start('daemon.js', {
    silent: true,
    args: ['-p', '8090'],
    watch: true,
    sourceDir: path.join(__dirname, '..', 'fixtures', 'watch'),
    watchDirectory: [
      path.join(__dirname, '..', 'fixtures', 'watch'),
      path.join(__dirname, '..', 'fixtures', 'watch_too'),
    ],
    debug: {
      prefix: "[WATCH %%]"
    }
  });
};

vows
  .describe('forever-monitor/plugins/watch - extra')
 
  .export(module);