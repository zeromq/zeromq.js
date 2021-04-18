var download = require("./download").download;
var spawnSync = require("child_process").spawnSync;
var path = require("path");
var fs = require("fs");

var ARCH = process.arch;
var ZMQ = "4.2.2";
var ZMQ_REPO = "libzmq";

if (process.env.npm_config_zmq_external == "true") {
  console.log("Requested to use external libzmq. Skipping libzmq build");
  process.exit(0);
}

function buildZMQ(scriptPath, zmqDir) {
  console.log("Building libzmq for " + process.platform);
  const child = spawnSync("/bin/sh", [scriptPath, ZMQ, ARCH], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  if (!child.status) {
    return console.error("child process exited with code " + child.status);
  }

  const message = "Succesfully build libzmq on " + Date();
  fs.writeFileSync(path.join(zmqDir, "BUILD_SUCCESS"), message)
}

function handleError(err) {
  if (!err) {
    return;
  }
  console.error(err);
  if (err.code === "ECONNRESET") {
    console.error("\n** Your connection was reset. **");
    console.error(
      "\n** Are you behind a proxy or a firewall that is preventing a connection? **"
    );
  }
  process.exit(1);
}

if (process.platform === "win32") {
  var LIB_URL =
    "https://github.com/nteract/libzmq-win/releases/download/v2.1.0/libzmq-" +
    ZMQ +
    "-" +
    process.arch +
    ".lib";
  var DIR_NAME = path.join(__dirname, "..", "windows", "lib");
  var FILE_NAME = path.join(DIR_NAME, "libzmq.lib");

  if (!fs.existsSync(DIR_NAME)) {
    fs.mkdirSync(DIR_NAME);
  }

  if (!fs.existsSync(FILE_NAME)) {
    console.log("Downloading libzmq for Windows");
    download(LIB_URL, FILE_NAME, function(err) {
      if (err) {
        handleError(err);
      }
      console.log("Download finished");
    });
  }
} else {
  var SCRIPT_PATH = path.join(__dirname, "build_libzmq.sh");
  var TAR_URL =
    "https://github.com/zeromq/" +
    ZMQ_REPO +
    "/releases/download/v" +
    ZMQ +
    "/zeromq-" +
    ZMQ +
    ".tar.gz";
  var DIR_NAME = path.join(__dirname, "..", "zmq");
  var FILE_NAME = path.join(DIR_NAME, "zeromq-" + ZMQ + ".tar.gz");

  if (!fs.existsSync(DIR_NAME)) {
    fs.mkdirSync(DIR_NAME);
  }

  if (fs.existsSync(path.join(DIR_NAME, "BUILD_SUCCESS"))) {
    console.log("Libzmq found, skipping rebuild.");
    process.exit(0);
  }

  if (fs.existsSync(FILE_NAME)) {
    buildZMQ(SCRIPT_PATH, DIR_NAME);
    process.exit(0);
  }

  download(TAR_URL, FILE_NAME, function(err) {
    if (err) {
      handleError(err);
    }
    try {
      buildZMQ(SCRIPT_PATH, DIR_NAME);
    } catch (err) {
      handleError(err);
    }
  });
}
