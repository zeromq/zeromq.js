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
          https.get(
            url.resolve(url.parse(fileUrl).hostname, response.headers.location),
            function(res) {
              writeToFile(filename, res, callback);
            }
          );
        }
      } else {
        writeToFile(filename, response, callback);
      }
    })
    .on("error", function(err) {
      console.error(err);
      if (err.code === "ECONNRESET") {
        console.error("\n** Your connection was reset. **");
        console.error(
          "\n** Are you behind a proxy or a firewall that is preventing a connection? **"
        );
      }
    });
}

module.exports = {
  download: download
};
