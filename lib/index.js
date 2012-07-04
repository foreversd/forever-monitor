
var utile = require('utile');

exports.Monitor = require('./forever-monitor/monitor').Monitor;

//
// ### function start (script, options)
// #### @script {string} Location of the script to run.
// #### @options {Object} Configuration for forever instance.
// Starts a script with forever
//
exports.start = function (script, options) {
  if (!options.uid) {
    options.uid = options.uid || utile.randomString(4).replace(/^\-/, '_');
  }
  
  return new exports.Monitor(script, options).start();
};
