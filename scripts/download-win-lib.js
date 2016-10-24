var download = require('./download').download;
var path = require('path');
var fs = require('fs');

var TAR_URL = 'https://github.com/nteract/zmq-prebuilt/releases/download/win-libzmq-4.1.5-v140/libzmq-' + process.arch + '.lib';
var DIR_NAME = path.join(__dirname, '..', 'windows', 'lib');
var FILE_NAME = path.join(DIR_NAME, 'libzmq.lib');

if (!fs.existsSync(DIR_NAME)) {
  fs.mkdirSync(DIR_NAME);
}

download(TAR_URL, FILE_NAME);
