
for (var i = 0; i < 10; i++) {
  console.log('stdout %d', i);
  console.error('stderr %d', i);
}

// With the Winston logs integration I've noticed that forever-monitor can't log all the info of this script.
// Ocassionally the stdout file didn't contain all ten records. After some investigation I figured out that the logger sometimes can't write
// all the information beacause the life of the script and the monitor process ends While the logger has still data to write. 
// By putting a delay the logs are tracked correctly
setTimeout(function(){}, 3000);