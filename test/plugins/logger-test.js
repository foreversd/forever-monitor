var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    vows = require('vows'),
    fmonitor = require('../../lib');

var fixturesDir = path.join(__dirname, '..', 'fixtures');

function checkLogOutput(file, stream, expectedLength) {
  var output = fs.readFileSync(path.join(fixturesDir, file), 'utf8'),
      lines = output.split('\n').slice(0, -1);

  assert.equal(lines.length, expectedLength);
  lines.forEach(function (line, i) {
    assert.equal(lines[i], stream + ' ' + (i % 10));
  });
}

function checkFileExists(file) {
  assert.isTrue(fs.existsSync(file), file+" exists");
}

vows.describe('forever-monitor/plugins/logger').addBatch({
  'When using the logger plugin': {
    'with custom log files': {
      topic: function () {
        var outlogs, errlogs, monitor;

        monitor = new fmonitor.Monitor(path.join(fixturesDir, 'logs.js'), {
          max: 1,
          silent: true,
          outFile: path.join(fixturesDir, 'logs-stdout.log'),
          errFile: path.join(fixturesDir, 'logs-stderr.log')
        });

        monitor.on('exit', this.callback.bind({}, null));
        monitor.start();
      },
      'log files should contain correct output': function (err) {
        checkLogOutput('logs-stdout.log', 'stdout', 10);
        checkLogOutput('logs-stderr.log', 'stderr', 10);
      }
    },
    'with custom log files and a process that exits': {
      topic: function () {
        var monitor = new fmonitor.Monitor(path.join(fixturesDir, 'logs.js'), {
          max: 5,
          silent: true,
          outFile: path.join(fixturesDir, 'logs-stdout-2.log'),
          errFile: path.join(fixturesDir, 'logs-stderr-2.log')
        });

        monitor.on('exit', this.callback.bind({}, null));
        monitor.start();
      },
      'logging should continue through process restarts': function (err) {
        checkLogOutput('logs-stdout-2.log', 'stdout', 50);
        checkLogOutput('logs-stderr-2.log', 'stderr', 50);
      }
    },
  }
}).addBatch({
  'When using the logger plugin': {
    'with custom log files and the append option set': {
      topic: function () {
        var monitor = new fmonitor.Monitor(path.join(fixturesDir, 'logs.js'), {
          max: 3,
          silent: true,
          append: true,
          outFile: path.join(fixturesDir, 'logs-stdout.log'),
          errFile: path.join(fixturesDir, 'logs-stderr.log')
        });

        monitor.on('exit', this.callback.bind({}, null));
        monitor.start();
      },
      'log files should not be truncated': function (err) {
        checkLogOutput('logs-stdout.log', 'stdout', 40);
        checkLogOutput('logs-stderr.log', 'stderr', 40);
      }
    }
  }
}).addBatch({
  'When using the logger plugin': {
    'with custom log files and sending custom exit code': {
      topic: function () {
        var currentLog = path.join(fixturesDir, 'reopen-logs-fever.log');
        var currentOut = path.join(fixturesDir, 'reopen-logs-stdout.log');
        var currentErr = path.join(fixturesDir, 'reopen-logs-stderr.log');

        // var rotatedLog = path.join(fixturesDir, 'reopen-logs-fever_rotated.log');
        // var rotatedOut = path.join(fixturesDir, 'reopen-logs-stdout_rotated.log');
        // var rotatedErr = path.join(fixturesDir, 'reopen-logs-stderr_rotated.log');

        var monitor = new fmonitor.Monitor(path.join(fixturesDir, 'reopen-logs.js'), {
          max: 3,
          silent: true,
          append: true,
          logFile: currentLog,
          outFile: currentOut,
          errFile: currentErr
        });

        monitor.start();

        var childPid = monitor.data.pid;

        monitor.on("reopenLogs", this.callback.bind({}, null));

        setTimeout(function() {
          process.kill(childPid, "SIGUSR2");
          // fs.rename(currentLog, rotatedLog, function() {
          //   fs.rename(currentOut, rotatedOut, function() {
          //     fs.rename(currentErr, rotatedErr, function() {
          //     });
          //   });
          // });
        }, 100);
      },
      'reopenLogs event should be emitted': function (topic) {
        assert.isTrue(true);
        // checkFileExists('reopen-logs-fever.log');
        // checkFileExists('reopen-logs-fever_rotated.log');
        // checkFileExists('reopen-logs-stdout.log');
        // checkFileExists('reopen-logs-stdout-stdout_rotated.log');
        // checkFileExists('reopen-logs-stderr.log');
        // checkFileExists('reopen-logs-stderr_rotated.log');
      }
    }
  }
}).export(module);

