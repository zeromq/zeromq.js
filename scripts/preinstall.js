if (process.platform === 'win32') {
  console.log('Downloading libzmq for Windows')
  var download = require('./download').download;
  var path = require('path');
  var fs = require('fs');

  var TAR_URL = 'https://github.com/nteract/libzmq-win/releases/download/v1.0.0/libzmq-' + process.arch + '.lib';
  var DIR_NAME = path.join(__dirname, '..', 'windows', 'lib');
  var FILE_NAME = path.join(DIR_NAME, 'libzmq.lib');

  if (!fs.existsSync(DIR_NAME)) {
    fs.mkdirSync(DIR_NAME);
  }

  download(TAR_URL, FILE_NAME);
} else {
  console.log('Building libzmq for ' + process.platform)

  var spawn = require('child_process').spawn;
  var child = spawn('./build_libzmq.sh');

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on('error', (err) => {
  console.log('Failed to start child process.');
});
}
