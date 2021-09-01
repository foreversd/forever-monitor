/*
 * watch-test.js: Tests for restarting forever processes when a file changes.
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENSE
 *
 */

const assert = require('assert'),
  path = require('path'),
  fs = require('fs'),
  vows = require('vows'),
  fmonitor = require('../../lib');

const watchDir = fs.realpathSync(
  path.join(__dirname, '..', 'fixtures', 'watch')
);
const watchDirToo = fs.realpathSync(
  path.join(__dirname, '..', 'fixtures', 'watch_too')
);

const getMonitor = function () {

  return fmonitor.start('daemon.js', {
    watch: true,
    silent: true,
    args: ['-p', '8090'],
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
  .describe('forever-monitor/plugins/watch')
  .addBatch({
    'When using forever with watch enabled forever should': {
      topic: function () {
        const child = getMonitor(this.callback);
        setTimeout(() => { this.callback(null, child); }, 500)
      },
      'have correct options set': function (child) {
        assert.isTrue(child.watchIgnoreDotFiles);
        assert.strictEqual(watchDir, fs.realpathSync(child.watchDirectory[0]));
        assert.strictEqual(watchDirToo, fs.realpathSync(child.watchDirectory[1]));
      },
      'read .foreverignore file and store ignore patterns': function (child) {
        assert.deepStrictEqual(
          child.watchIgnorePatterns,
          fs
            .readFileSync(path.join(watchDir, '.foreverignore'), 'utf8')
            .split('\n')
            .filter(Boolean)
        );
      },
      teardown: function (child) {
        child.stop();
      },
    },
  })
  .addBatch({
    'When using forever with watch enabled restart the script': {
      topic: function () {
        const child = getMonitor(this.callback);
        setTimeout(() => { this.callback(null, child); }, 500)
      },
      'when file': function (child) {
        child.once('restart', this.callback);
        fs.writeFileSync(
          path.join(watchDir, 'file'),
          '// hello, I know nodejitsu.'
        );
      },
      'changes': function () {
        fs.writeFileSync(
          path.join(watchDir, 'file'),
          '/* hello, I know nodejitsu. '
        );
      },
      teardown: function (child) {
        child.stop();
      },
    },
  })
  .addBatch({
    'When using forever with watch enabled restart the script': {
      topic: function () {
        const child = getMonitor(this.callback);
        setTimeout(() => { this.callback(null, child); }, 500)
      },
      'when file in second directory changes': function (child) {
        child.once('restart', this.callback);
        fs.writeFileSync(
          path.join(watchDirToo, 'file'),
          '// hello, I know nodejitsu.'
        );
      },
      'is changed': function () {
        fs.writeFileSync(
          path.join(watchDirToo, 'file'),
          '/* hello, I know nodejitsu. '
        );
      },
      teardown: function (child) {
        child.stop();
      },
    },
  })
  .addBatch({
    'When using forever with watch enabled restart the script': {
      topic: function () {
        const child = getMonitor(this.callback);
        setTimeout(() => { this.callback(null, child); }, 500)
      },
      'when file is added': function (child) {
        child.once('restart', this.callback);
        fs.writeFileSync(path.join(watchDir, 'newFile'), '');
        fs.unlinkSync(path.join(watchDir, 'newFile'));
      },
      teardown: function (child) {
        child.stop();
      },
    },
  })
  .addBatch({
    'When using forever with watch enabled restart the script': {
      topic: function () {
        const child = getMonitor(this.callback);
        setTimeout(() => { this.callback(null, child); }, 500)
      },
      'when file is removed': function (child) {
        fs.writeFileSync(path.join(watchDir, 'removeMe'), '');
        child.once('restart', this.callback);
        fs.unlinkSync(path.join(watchDir, 'removeMe'));
      },
      teardown: function (child) {
        child.stop();
      },
    },
  })
  .addBatch({
    'When using forever with watch enabled': {
      'when a file matching an ignore pattern is added': {
        topic: function () {
          const monitor = getMonitor(this.callback);
          const self = this;
          this.filenames = [
            path.join(watchDir, 'ignore_newFile'),
            path.join(watchDir, 'ignoredDir', 'ignore_subfile'),
          ];

          //
          // Setup a bad restart function
          //
          function badRestart() {
            self.callback(new Error('Monitor restarted at incorrect time.'), null);
          }

          monitor.once('restart', badRestart);
          this.filenames.forEach(function (filename) {
            fs.writeFileSync(filename, '');
          });

          //
          // `chokidar` does not emit anything when ignored
          // files have changed so we need a setTimeout here
          // to prove that nothing has happened.
          //
          setTimeout(function () {
            monitor.removeListener('restart', badRestart);
            monitor.stop();
            self.callback(null, null);
          }, 1000);

          return undefined;
        },
        'do nothing': function (err) {
          assert.isNull(err);
          this.filenames.forEach(function (filename) {
            fs.unlinkSync(filename);
          });
        },
      },
    },
  })
  .export(module);

