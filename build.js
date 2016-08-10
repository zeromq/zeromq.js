#!/usr/bin/env node
const exec = require('child_process').exec;

if (process.platform === 'linux' || process.platform === 'darwin') {
  exec('./build_libzmq.sh', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    if (err) {
      throw err;
    }
  });
} else if (process.platform === 'win32') {
  throw Error('Builds for windows not yet implemented.');
} else {
  throw Error('Builds for ' + process.platform + ' are not yet supported.');
}
