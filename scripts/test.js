var Mocha = require("mocha");
var fs = require("fs");
var path = require("path");
var mocha = new Mocha({
  ui: "bdd",
  reporter: "spec"
});
var type = process.argv[2];
var UNIT_TEST_DIR_MODELS = __dirname + "/../test/unit/models/";

// `type` is the third argument passed into the script to determine
// which subset of tests to run
// `node ./scripts/test.js functional` to run functional tests
// `node ./scripts/test.js unit` to run unit tests
// `node ./scripts/test.js` to run all tests
var testDirectories = [];

if (type) {
  testDirectories.push(__dirname + "/../test/" + type);
}
else {
  fs.readdirSync(__dirname + "/../test/").forEach(function (dir) {
    testDirectories.push(dir);
  });
}

// Add files to mocha runner
var suites = [];
testDirectories.forEach(function (dir) {
  fs.readdirSync(dir).filter(filterValid).forEach(function (file) {
    mocha.addFile(path.join(dir, file));
  });
});

mocha.run(function (failures) {
  process.exit(failures);
});

function filterValid (file) {
  return file.substr(-3) === ".js";
}
