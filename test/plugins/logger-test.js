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
    assert.equal(true, lines[i].indexOf(stream + ' ' + (i % 10)) !== -1);
  });
}

vows.describe('forever-monitor/plugins/logger').addBatch({
  'When using the logger plugin': {
    'with custom log files': {
      topic: function () {
        var that = this,
            outlogs,
            errlogs,
            monitor;

        monitor = new fmonitor.Monitor(path.join(fixturesDir, 'logs.js'), {
          max: 1,
          silent: true,
          outFile: path.join(fixturesDir, 'logs-stdout.log'),
          errFile: path.join(fixturesDir, 'logs-stderr.log')
        });

        monitor.on('exit', function () {
          setTimeout(that.callback, 2000);
        });
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
    },
    'with log rotation enabled': {
      topic: function () {
        var monitor = new fmonitor.Monitor(path.join(fixturesDir, 'logs.js'), {
          max: 2,
          silent: true,
          logFile: path.join(fixturesDir, 'logsr.log'),
          outFile: path.join(fixturesDir, 'logsr-stdout.log'),
          errFile: path.join(fixturesDir, 'logsr-stderr.log'),
          tailable: true,
          maxsize: 50,
          maxFiles: 1,
          zippedArchive: true
        });

        monitor.on('exit', this.callback.bind({}, null));
        monitor.start();
      },
      'log files should be rotated': function (err) {
        assert.equal(true, fs.existsSync(path.join(fixturesDir, 'logsr1.log.gz')));
        assert.equal(true, fs.existsSync(path.join(fixturesDir, 'logsr-stdout1.log.gz')));
        assert.equal(true, fs.existsSync(path.join(fixturesDir, 'logsr-stderr1.log.gz')));
      }
    }
  }
}).export(module);

