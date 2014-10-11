var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var expect = require("chai").expect;
var utils = require("../utils");
var Jackie = require("../../");
var app1Manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "/../fixtures/app1.json"), "utf8").toString());
var Application = require("../../lib/application");
var Environment = require("../../lib/environment");

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
      app.initialize({ Description: "my description" }).then(function () {
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
        return app.initialize({ Description: "my description" });
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
      app.initialize({ Description: "my description" }).then(function () {
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

  describe("Application#createEnvironment", function () {
    it("creates an environment instance with correct options", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      var env = app.createEnvironment("myenv");
      expect(env.appName).to.be.equal("testapp");
      expect(env.envName).to.be.equal("myenv");
      expect(env instanceof Environment).to.be.equal(true);
      done();
    });
  });

  describe("Application#createVersion", function () {
    it("creates an application version", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      app.initialize().then(function () {
        return utils.addFileToBucket(jackie._eb, "jackie-test-mybucket1453", "testapp.zip", path.join(__dirname, "..", "fixtures", "testapp.zip"));
      }).then(function () {
        return app.createVersion({
          Description: "new version",
          VersionLabel: "1.0.0",
          SourceBundle: { S3Bucket: "jackie-test-mybucket1453", S3Key: "testapp.zip" }
        });
      }).then(function (data) {
        expect(data.ApplicationVersion.ApplicationName).to.be.equal("testapp");
        expect(data.ApplicationVersion.VersionLabel).to.be.equal("1.0.0");
        expect(data.ApplicationVersion.SourceBundle.S3Bucket).to.be.equal("jackie-test-mybucket1453");
        expect(data.ApplicationVersion.SourceBundle.S3Key).to.be.equal("testapp.zip");
        return app.info();
      }).then(function (data) {
        expect(data.Versions[0]).to.be.equal("1.0.0");
        done();
      }, done);
    });
  });

  describe("Application#update", function () {
    it("updates application with values", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "testapp");
      app.initialize().then(function () {
        return app.update({ Description: "my new desc" });
      }).then(function () {
        return app.info();
      }).then(function (data) {
        expect(data.Description).to.be.equal("my new desc");
        done();
      }, done);
    });
  });
});
