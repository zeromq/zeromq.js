var exec = require('child_process').exec;

var path = './node_modules/prebuild-install/bin.js';
var platform = process.platform;
var arch = process.arch;

if (platform === 'linux' && arch === 'arm') {
  arch += 'v' + process.config.variables.arm_version;
}

exec(path + ' --arch=' + arch, function(err, stdout, stderr) {
  console.log(stdout);
  console.log(stderr);
  if (err) process.exit(1);
});
