var https = require("https");
var fs = require("fs");
var url = require("url");

function writeToFile(filename, response, callback) {
  response.pipe(fs.createWriteStream(filename));
  response.on("end", callback);
}

function download(fileUrl, filename, callback) {
  https
    .get(fileUrl, function(response) {
      if (
        response.statusCode > 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        if (url.parse(response.headers.location).hostname) {
          https.get(response.headers.location, function(res) {
            writeToFile(filename, res, callback);
          });
        } else {
          https
            .get(
              url.resolve(
                url.parse(fileUrl).hostname,
                response.headers.location
              ),
              function(res) {
                writeToFile(filename, res, callback);
              }
            )
            .on("error", callback);
        }
      } else {
        writeToFile(filename, response, callback);
      }
    })
    .on("error", callback);
}

module.exports = {
  download: download
};
