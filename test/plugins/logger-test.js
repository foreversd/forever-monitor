const assert = require('assert'),
  fs = require('fs'),
  stream = require('stream'),
  path = require('path'),
  vows = require('vows'),
  fmonitor = require('../../lib');

const fixturesDir = path.join(__dirname, '..', 'fixtures');

const logArrays = {
  stdoutLog: "",
  stderrLog: "",
}

function checkLogOutput(file, stream, expectedLength) {
  const output = fs.readFileSync(path.join(fixturesDir, file), 'utf8'),
    lines = output.split('\n').slice(0, -1);

  assert.strictEqual(lines.length, expectedLength);
  lines.forEach(function (line, i) {
    assert.strictEqual(lines[i], stream + ' ' + (i % 10));
  });
}

function checkLogArrayOutput(logArray, stream, expectedLength) {
  assert.strictEqual(logArray.length, expectedLength);
  logArray.forEach(function (line, i) {
    assert.strictEqual(logArray[i], stream + ' ' + (i % 10));
  });
}

vows
  .describe('forever-monitor/plugins/logger')
  .addBatch({
    'When using the logger plugin': {
      'with custom log files': {
        topic: function () {
          const that = this;

          const monitor = new fmonitor.Monitor(
            path.join(fixturesDir, 'logs.js'),
            {
              max: 1,
              silent: true,
              outFile: path.join(fixturesDir, 'logs-stdout.log'),
              errFile: path.join(fixturesDir, 'logs-stderr.log'),
            }
          );

          monitor.on('exit', function () {
            setTimeout(that.callback, 2000);
          });
          monitor.start();
        },
        'log files should contain correct output': function (err) {
          checkLogOutput('logs-stdout.log', 'stdout', 10);
          checkLogOutput('logs-stderr.log', 'stderr', 10);
        },
      },
      'with custom log files and a process that exits': {
        topic: function () {
          const monitor = new fmonitor.Monitor(
            path.join(fixturesDir, 'logs.js'),
            {
              max: 5,
              silent: true,
              outFile: path.join(fixturesDir, 'logs-stdout-2.log'),
              errFile: path.join(fixturesDir, 'logs-stderr-2.log'),
            }
          );

          monitor.on('exit', this.callback.bind({}, null));
          monitor.start();
        },
        'logging should continue through process restarts': function (err) {
          checkLogOutput('logs-stdout-2.log', 'stdout', 50);
          checkLogOutput('logs-stderr-2.log', 'stderr', 50);
        },
      },
    },
  })
  .addBatch({
    'When using the logger plugin': {
      'with custom log files and the append option set': {
        topic: function () {
          const monitor = new fmonitor.Monitor(
            path.join(fixturesDir, 'logs.js'),
            {
              max: 3,
              silent: true,
              append: true,
              outFile: path.join(fixturesDir, 'logs-stdout.log'),
              errFile: path.join(fixturesDir, 'logs-stderr.log'),
            }
          );

          monitor.on('exit', this.callback.bind({}, null));
          monitor.start();
        },
        'log files should not be truncated': function (err) {
          checkLogOutput('logs-stdout.log', 'stdout', 40);
          checkLogOutput('logs-stderr.log', 'stderr', 40);
        },
      },
    },
  })
  .addBatch({
    'When using the logger plugin': {
      'with custom event names': {
        topic: function () {
          const monitor = new fmonitor.Monitor(
            path.join(fixturesDir, 'logs.js'),
            {
              max: 3,
              silent: true,
              stdoutEventName: 'log-stdout',
              stderrEventName: 'log-stderr',
            }
          );

          monitor.start();

          monitor.on('log-stdout', (data) => { logArrays.stdoutLog += data.toString()})
          monitor.on('log-stderr', (data) => { logArrays.stderrLog += data.toString()})

          monitor.on('exit', this.callback.bind({},null));
        },
        'log strings should not be truncated': function (err) {
          checkLogArrayOutput(logArrays.stdoutLog.split("\n").filter(Boolean), 'stdout', 30);
          checkLogArrayOutput(logArrays.stderrLog.split("\n").filter(Boolean), 'stderr', 30);
        },
        teardown: function () {
          logArrays.stdoutLog = "";
          logArrays.stderrLog = "";
        }
      },
    },
  })
  .addBatch({
    'When using the logger plugin': {
      'with custom event pipes': {
        topic: function () {

          const pipeLog = new stream.PassThrough({});
          const pipeError = new stream.PassThrough({});

          pipeLog.on('data', (data) => { logArrays.stdoutLog += data.toString()});
          pipeError.on('data', (data) => { logArrays.stderrLog += data.toString()});

          const monitor = new fmonitor.Monitor(
            path.join(fixturesDir, 'logs.js'),
            {
              max: 3,
              silent: true,
              customStdout: pipeLog,
              customStderr: pipeError,
            }
          );

          monitor.start();

          monitor.on('exit', this.callback.bind({},null));
        },
        'piped log strings should not be truncated': function (err) {
          checkLogArrayOutput(logArrays.stdoutLog.split("\n").filter(Boolean), 'stdout', 30);
          checkLogArrayOutput(logArrays.stderrLog.split("\n").filter(Boolean), 'stderr', 30);
        },
        teardown: function () {
          logArrays.stdoutLog = "";
          logArrays.stderrLog = "";
        }
      },

    },
  })
  .export(module);
