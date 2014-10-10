var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var expect = require("chai").expect;
var utils = require("../utils");
var Jackie = require("../../");
var app1Manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "/../fixtures/app1.json"), "utf8").toString());

describe("Application", function () {
  this.timeout(100000);
  it("Application#initialize() creates a new application if doesn't exist", function (done) {
    var j = new Jackie(utils.AWSConfig());
    j.addApplication(app1Manifest).then(function (data) {
      console.log(done);
      done();
    }, done);
  });
});
