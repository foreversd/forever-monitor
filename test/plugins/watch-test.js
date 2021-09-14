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

const examplesDir = path.join(__dirname, '..', '..', '..', 'examples');

const watchDir = fs.realpathSync(
  path.join(__dirname, '..', 'fixtures', 'watch')
);
const watchDirToo = fs.realpathSync(
  path.join(__dirname, '..', 'fixtures', 'watch_too')
);

vows
  .describe('forever-monitor/plugins/watch')
  .addBatch({
    'When using forever with watch enabled': {
      topic: function () {
        const self = this;
        const monitor = fmonitor.start('daemon.js', {
          watch: true,
          silent: true,
          args: ['-p', '8090'],
          sourceDir: path.join(__dirname, '..', 'fixtures', 'watch'),
          watchDirectory: [
            path.join(__dirname, '..', 'fixtures', 'watch'),
            path.join(__dirname, '..', 'fixtures', 'watch_too'),
          ],
          debug: {
            prefix: "[WATCH-STARTSTOP %%]",
          }
        });
        let tmt = false;

        monitor.on('watch:started', () => {
          console.log('TEST: watch:started');
          monitor.on('watch:closed', () => {
            tmt = true;
            self.callback(null, true);
          })
          setTimeout(() => {
            if (!tmt) {
              self.callback(null, false);
            }
          }, 5000);
          monitor.stop();
        });
      },
      'forever should close gracefully': function (result) {
        assert.isTrue(result);
      }
    },
  })
  .addBatch({
    'When using forever with watch enabled': {
      topic: fmonitor.start('daemon.js', {
        watch: true,
        silent: true,
        args: ['-p', '8090'],
        sourceDir: path.join(__dirname, '..', 'fixtures', 'watch'),
        watchDirectory: [
          path.join(__dirname, '..', 'fixtures', 'watch'),
          path.join(__dirname, '..', 'fixtures', 'watch_too'),
        ],
        debug: {
          prefix: "[WATCH %%]",
        },
      }),
      'forever should': {
        'have correct options set': function (child) {
          child.on("watch:started", () => {
            assert.isTrue(child.watchIgnoreDotFiles);
            assert.strictEqual(watchDir, fs.realpathSync(child.watchDirectory[0]));
            assert.strictEqual(watchDirToo, fs.realpathSync(child.watchDirectory[1]));
            this.callback(null, child);
          })
        },
        'read .foreverignore file and store ignore patterns': function (child) {
          child.on("watch:started", () => {
            assert.deepStrictEqual(
              child.watchIgnorePatterns,
              fs
                .readFileSync(path.join(watchDir, '.foreverignore'), 'utf8')
                .split('\n')
                .filter(Boolean)
            );
          })
        },
      },
      teardown: function (child) {
        if (child && child.running) {
          child.stop();
        }
        return;
      },
    },
  })
  .addBatch({
    'When using forever with watch enabled': {
      topic: fmonitor.start('daemon.js', {
        watch: true,
        silent: true,
        args: ['-p', '8090'],
        sourceDir: path.join(__dirname, '..', 'fixtures', 'watch'),
        watchDirectory: [
          path.join(__dirname, '..', 'fixtures', 'watch'),
          path.join(__dirname, '..', 'fixtures', 'watch_too'),
        ],
        debug: {
          prefix: "[WATCH %%]",
        },
      }),
      'restart the script': {
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
        'is added': function (child) {
          child.once('restart', this.callback);
          fs.writeFileSync(path.join(watchDir, 'newFile'), '');
          fs.unlinkSync(path.join(watchDir, 'newFile'));
        },
        'is removed': function (child) {
          fs.writeFileSync(path.join(watchDir, 'removeMe'), '');
          child.once('restart', this.callback);
          fs.unlinkSync(path.join(watchDir, 'removeMe'));
        },
        'in second directory': {
          'changes': function (child) {
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
        },
        teardown: function (child) {
          if (child && child.running) {
            child.stop();
          }
          return;
        }
      }
    }
  })
  .addBatch({
    'when a file matching an ignore pattern is added': {
      topic: function () {
        const monitor = fmonitor.start('daemon.js', {
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
          },
        });

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

        monitor.on("start", () => {
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
        });

        return undefined;
      },
      'do nothing': function (err) {
        this.filenames.forEach(function (filename) {
          fs.unlinkSync(filename);
        });
        assert.isNull(err);
      },
      teardown: function (child) {
        if (child && child.running) {
          child.stop();
        }
        return;
      },
    },
  })
  .export(module);

