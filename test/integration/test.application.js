var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var expect = require("chai").expect;
var utils = require("../utils");
var Jackie = require("../../");
var app1Manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "/../fixtures/app1.json"), "utf8").toString());
var Application = require("../../lib/application");

function clear (done) {
  if (!this.jackie) {
    this.jackie = new Jackie(utils.AWSConfig());
  }
  utils.clearAWS(this.jackie._eb).then(done);
}

describe("Application", function () {
  this.timeout(100000);
  before(clear);

  describe("Application#initialize()", function () {
    afterEach(clear);

    it("adds application to AWS if does not exist", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      app.initialize({ description: "my description" }).then(function () {
        return jackie.getApplications();
      }).then(function (apps) {
        expect(apps.length).to.be.equal(1);
        expect(apps[0] instanceof Application).to.be.equal(true);
        expect(apps[0].appName).to.be.equal("testapp");
        return apps[0].info();
      }).then(function (data) {
        expect(data.Description).to.be.equal("my description");
        done();
      }, done);
    });
    
    it("updates description if application exists", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      app.initialize().then(function () {
        return app.initialize({ description: "my description" });
      }).then(function () {
        return jackie.getApplications();
      }).then(function (apps) {
        expect(apps.length).to.be.equal(1);
        expect(apps[0] instanceof Application).to.be.equal(true);
        expect(apps[0].appName).to.be.equal("testapp");
        return apps[0].info();
      }).then(function (data) {
        expect(data.Description).to.be.equal("my description");
        done();
      }, done);
    });
  });

  describe("Application#info", function () {
    afterEach(clear);

    it("returns AWS ApplicationDescription", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      app.initialize({ description: "my description" }).then(function () {
        return app.info();
      }).then(function (data) {
        expect(data.ApplicationName).to.be.equal("testapp");
        expect(data.Description).to.be.equal("my description");
        expect(data.DateCreated).to.be.an.instanceof(Date);
        expect(data.DateUpdated).to.be.an.instanceof(Date);
        expect(data.Versions).to.be.an.instanceof(Array);
        expect(data.ConfigurationTemplates).to.be.an.instanceof(Array);
        done();
      }, done);
    });
    
    it("returns null if application does not exist on AWS", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      app.info().then(function (data) {
        expect(data).to.be.equal(null);
        done();
      }, done);
    });
  });
});
