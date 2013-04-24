var i = 0;
var log = function() {
  console.log("Test...", i++);
  if (i%10 === 0) { console.error("Error!!"); }
};

setInterval(log, 1000);
log();

console.log(process.pid);

process.on("SIGUSR2", function() {
  console.log("Received SIGUSR2 signal. Stopping application");
  process.exit(13); // Notice this exit code. This tells forever that the script wants to reopen its log files.
});