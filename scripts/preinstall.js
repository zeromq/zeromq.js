var download = require('./download').download;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

var ZMQ = '4.2.0';

function buildZMQ(scriptPath) {
  console.log('Building libzmq for ' + process.platform);

  var child = spawn(scriptPath, [ZMQ]);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on('error', function(err) {
    console.error('Failed to start child process.');
  });
}

if (process.platform === 'win32') {
  var LIB_URL = 'https://github.com/nteract/libzmq-win/releases/download/v2.0.0/libzmq-' + ZMQ + '-' + process.arch + '.lib';
  var DIR_NAME = path.join(__dirname, '..', 'windows', 'lib');
  var FILE_NAME = path.join(DIR_NAME, 'libzmq.lib');

  if (!fs.existsSync(DIR_NAME)) {
    fs.mkdirSync(DIR_NAME);
  }

  if (!fs.existsSync(FILE_NAME)) {
    console.log('Downloading libzmq for Windows');
    download(LIB_URL, FILE_NAME, function() {
      console.log('Download finished');
    });
  }

} else {
  var SCRIPT_PATH = path.join(__dirname, 'build_libzmq.sh');
  var TAR_URL = 'https://github.com/zeromq/libzmq/releases/download/v' + ZMQ + '/zeromq-' + ZMQ + '.tar.gz';
  var DIR = path.join(__dirname, '..', 'zmq');
  var FILE_NAME = path.join(DIR, 'zeromq-' + ZMQ + '.tar.gz');

  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR);
  }

  if (fs.existsSync(FILE_NAME)) {
    buildZMQ(SCRIPT_PATH);
  } else {
    download(TAR_URL, FILE_NAME, function() {
      buildZMQ(SCRIPT_PATH);
    });
  }
}
