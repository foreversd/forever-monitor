/*
 * macros.js: Test macros for the forever-monitor module
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

const assert = require('assert'),
  fmonitor = require('../../lib');

const macros = exports;

macros.assertTimes = function(script, times, options) {
  options.max = times;

  return {
    topic: function() {
      const child = new fmonitor.Monitor(script, options);
      child.on('exit', this.callback.bind({}, null));
      child.start();
    },
    "should emit 'exit' when completed": function(err, child) {
      assert.strictEqual(child.times, times);
    },
  };
};

macros.assertStartsWith = function(string, substring) {
  assert.strictEqual(string.slice(0, substring.length), substring);
};

macros.assertList = function(list) {
  assert.isNotNull(list);
  assert.lengthOf(list, 1);
};
