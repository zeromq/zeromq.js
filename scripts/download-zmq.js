var download = require('./download').download;

var TAR_URL = 'https://github.com/' + process.env.ZMQ_REPO + '/releases/download/v' + process.env.ZMQ + '/zeromq-' + process.env.ZMQ + '.tar.gz';
var FILE_NAME = 'zeromq-' + process.env.ZMQ + '.tar.gz';

download(TAR_URL, FILE_NAME);
