var https = require('https');
var fs = require('fs');
var url = require('url');

function writeToFile(filename, response) {
  response.pipe(fs.createWriteStream(filename));
}

function download(fileUrl, filename) {
  https.get(fileUrl, function(response) {
    if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
      if (url.parse(response.headers.location).hostname) {
        https.get(response.headers.location, function(res) {
          writeToFile(filename, res);
        });
      } else {
        https.get(url.resolve(url.parse(fileUrl).hostname, response.headers.location), function(res) {
          writeToFile(filename, res);
        });
      }
    } else {
      writeToFile(filename, response);
    }
  });
}

module.exports = {
  download
};
