var https = require('https');
var fs = require('fs');
var url = require('url');

var TAR_URL = 'https://github.com/' + process.env.ZMQ_REPO + '/releases/download/v' + process.env.ZMQ + '/zeromq-' + process.env.ZMQ + '.tar.gz';
var FILE_NAME = 'zeromq-' + process.env.ZMQ + '.tar.gz';

function writeToFile(response) {
  response.pipe(fs.createWriteStream(FILE_NAME));
}

https.get(TAR_URL, function(response) {
  if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
    if (url.parse(response.headers.location).hostname) {
      https.get(response.headers.location, writeToFile);
    } else {
      https.get(url.resolve(url.parse(TAR_URL).hostname, response.headers.location), writeToFile);
    }
  } else {
    writeToFile(response);
  }
});
