/*
 * watch.js: Plugin for `Monitor` instances which decreases the count of
 * failures over time. It makes the max option time sensitive (ie it's not the
 * same to have 10 failures in 10 seconds and 10 failures in 10 weeks).
 *
 * (C) 2010 Charlie Robbins & the Contributors
 * MIT LICENCE
 *
 */

//
// Name the plugin
//
exports.name = 'cooldown';

//
// ### function attach (options)
// #### @options {Object} Options for attaching to `Monitor`
//
// Attaches functionality for logging stdout and stderr to `Monitor` instances.
//
exports.attach = function (options) {
  var monitor = this;

  setInterval(function() {
    monitor.times = Math.floor(monitor.times / 2);
  }, options.cooldownInterval * 1000);
}
