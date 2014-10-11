var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var expect = require("chai").expect;
var utils = require("../utils");
var Jackie = require("../../");
var app1Manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "/../fixtures/app1.json"), "utf8").toString());
var Application = require("../../lib/application");

var app1 = {
  name: "jackietest My App",
  description: "An app for testing jackie."
};

function clear (done) {
  if (!this.jackie) {
    this.jackie = new Jackie(utils.AWSConfig());
  }
  utils.clearAWS(this.jackie._eb).then(done);
}

describe("Jackie", function () {
  this.timeout(100000);
  before(clear);

  describe("Jackie#createApplication", function () {
    afterEach(clear);

    it("adds a new application on AWS and creates", function (done) {
      this.jackie = new Jackie(utils.AWSConfig());
      this.jackie.createApplication(app1).then(function (app) {
        expect(app instanceof Application).to.be.equal(true);
        expect(app.appName).to.be.equal(app1.name);
        done();
      }, done);
    });

    it("works idempotently even if application already exists on AWS", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.createApplication(app1).then(function (app) {
        return jackie.createApplication(app1);
      }).then(function (app) {
        expect(app instanceof Application).to.be.equal(true);
        expect(app.appName).to.be.equal(app1.name);
        done();
      }, done);
    });

    it("updates description if different", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.createApplication(app1).then(function (app) {
        return jackie.createApplication({ name: app1.name, description: "a new description" });
      }).then(function (app) {
        return jackie.getApplication(app1.name);
      }).then(function (app) {
        expect(app.description).to.be.equal("a new description");
        done();
      }, done);
    });
  });

  describe("Jackie#removeApplication", function () {
    afterEach(clear);

    it("removes existing application", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.createApplication(app1).then(function (app) {
        return jackie.removeApplication(app.appName);
      }).then(function () {
        return utils.waitUntilDeleted(jackie._eb);
      }).then(function () {
        return jackie.getApplications();
      }).then(function (apps) {
        expect(apps.length).to.be.equal(0);
        done();
      }, done);
    });

    it("ignores if application doesn't exist", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.removeApplication("doesnt exist").then(function (res) {
        console.log(res);
        expect(true).to.be.equal(true);
        done();
      }, done);
    });
  });

  describe("Jackie#getApplication", function () {
    afterEach(clear);

    it("returns associated application", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.createApplication(app1).then(function (app) {
        return jackie.getApplication(app1.name);
      }).then(function (app) {
        expect(app.appName).to.be.equal(app1.name);
        done();
      }, done);
    });

    it("returns null if not found", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.getApplication("not here").then(function (app) {
        expect(app).to.be.equal(null);
        done();
      }, done);
    });
  });

  describe("Jackie#getApplications", function () {
    it("returns all applications", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      jackie.createApplication(app1).then(function () {
        return jackie.createApplication({ name: "app2" });
      }).then(function () {
        return jackie.getApplications();
      }).then(function (apps) {
        expect(apps.length).to.be.equal(2);
        done();
      }, done);
    });
  });
});
