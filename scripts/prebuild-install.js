var exec = require('child_process').exec;

var pbi = 'prebuild-install';
var platform = process.platform;
var arch = process.arch;

if (platform === 'linux' && arch === 'arm') {
  arch += 'v' + process.config.variables.arm_version;
  pbi += ' --arch=' + arch;
}

exec(pbi, function(err, stdout, stderr) {
  console.log(stdout);
  console.log(stderr);
  if (err) process.exit(1);
});
