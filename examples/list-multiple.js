const path = require('path'),
    async = require('utile').async,
    forever = require('../lib/forever');

const script = path.join(__dirname, 'server.js');

function startServer(port, next) {
    const child = new forever.Monitor(script, {
        args: ['--port', port],
        silent: true,
    });

    child.start();
  child.on('start', function(_, data) {
    console.log('Forever process running server.js on ' + port);
    next(null, child);
  });
}

// Array config data
const ports = [8080, 8081, 8082];

async.map(ports, startServer, function(err, monitors) {
  forever.startServer(monitors, function() {
    //
    // Now that the server has started, run `forever.list()`
    //
    forever.list(false, function(err, data) {
      if (err) {
        console.log('Error running `forever.list()`');
        console.dir(err);
      }

      console.log('Data returned from `forever.list()`');
      console.dir(data);
    });
  });
});
