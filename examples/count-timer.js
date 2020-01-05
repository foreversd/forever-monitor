const util = require('util');

let count = 0;

const id = setInterval(function() {
  util.puts('Count is ' + count + '. Incrementing now.');
  count++;
}, 1000);
