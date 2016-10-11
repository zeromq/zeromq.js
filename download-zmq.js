var https = require('https');
var fs = require('fs');

var file = fs.createWriteStream('zeromq-' + process.env.ZMQ + '.tar.gz');
var request = https.get('https://github.com/' + process.env.ZMQ_REPO + '/releases/download/v' + process.env.ZMQ + '/zeromq-' + process.env.ZMQ + '.tar.gz', function(response) {
  response.pipe(file);
});
