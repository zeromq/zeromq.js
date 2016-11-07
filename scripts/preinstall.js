var download = require('./download').download;
var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');

var ZMQ;
var ZMQ_REPO;
if (process.platform == 'linux') {
  ZMQ = '4.1.6';
  ZMQ_REPO = 'zeromq4-1';
} else {
  ZMQ = '4.2.0';
  ZMQ_REPO = 'libzmq';
}

function buildZMQ(scriptPath, zmqDir) {
  console.log('Building libzmq for ' + process.platform);

  var child = spawn(scriptPath, [ZMQ]);

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on('error', function(err) {
    console.error('Failed to start child process.');
  });
  child.on('close', function(code) {
    if (code !== 0) {
      return console.error('child process exited with code ' + code);
    }
    var message = 'Succesfully build libzmq on ' + Date();
    fs.writeFile(path.join(zmqDir, 'BUILD_SUCCESS'), message, function(err) {
      if (err) {
        return console.error(err.message);
      }
      console.log(message);
    });
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
  var TAR_URL = 'https://github.com/zeromq/' + ZMQ_REPO + '/releases/download/v' + ZMQ + '/zeromq-' + ZMQ + '.tar.gz';
  var DIR_NAME = path.join(__dirname, '..', 'zmq');
  var FILE_NAME = path.join(DIR_NAME, 'zeromq-' + ZMQ + '.tar.gz');

  if (!fs.existsSync(DIR_NAME)) {
    fs.mkdirSync(DIR_NAME);
  }

  if (fs.existsSync(path.join(DIR_NAME, 'BUILD_SUCCESS'))) {
    return console.log('Libzmq found, skipping rebuild.');
  }

  if (fs.existsSync(FILE_NAME)) {
    return buildZMQ(SCRIPT_PATH, DIR_NAME);
  }

  download(TAR_URL, FILE_NAME, function() {
    buildZMQ(SCRIPT_PATH, DIR_NAME);
  });

}
