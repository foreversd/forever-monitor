/*
 * send-test.js: Tests sending child processes messages.
 *
 * (C) 2013 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

const assert = require('assert'),
  path = require('path'),
  vows = require('vows'),
  fmonitor = require('../../lib');

vows
  .describe('forever-monitor/monitor/send')
  .addBatch({
    'When using forever-monitor': {
      'and spawning a script': {
        'the parent process can send the child a message': {
          topic: function() {
            const script = path.join(
                __dirname,
                '..',
                'fixtures',
                'send-pong.js'
              ),
              child = new fmonitor.Monitor(script, {
                silent: false,
                minUptime: 2000,
                max: 1,
                fork: true,
              });

            const timeout = setTimeout(this.callback.bind(new Error("TIMEOUT"), null), 5000);
            child.on('message', (msg)=> {
              clearTimeout(timeout);
              child.stop();
              this.callback.bind(null, null)(msg);
            });
            child.start();
            child.send({ from: 'parent' });
          },
          'should reemit the message correctly': function(err, msg) {
            assert.isObject(msg);
            assert.deepStrictEqual(msg, { message: { from: 'parent' }, pong: true });
          }
        },
      },
    },
  })
  .export(module);
