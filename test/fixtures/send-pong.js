if (process.send) {

    console.log('started');

    process.on('message', function(m) {
      process.send({pong: true, message: m});
    });

}
