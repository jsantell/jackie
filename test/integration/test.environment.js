var fs = require("fs");
var path = require("path");
var expect = require("chai").expect;
var utils = require("../utils");
var Jackie = require("../../");
var Application = require("../../lib/application");
var Environment = require("../../lib/environment");

function clear (done) {
  if (!this.jackie) {
    this.jackie = new Jackie(utils.AWSConfig());
  }
  utils.clearAWS(this.jackie._eb).then(done);
}

describe("Environment", function () {
  this.timeout(100000);
  before(clear);

  describe("Environment#initialize()", function () {
    afterEach(clear);

    it("adds environment to AWS if does not exist", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "test-environment-init");
      app.initialize().then(function (app) {
        var env = new Environment(jackie._eb, "test-environment-init", "enviro");
        return env.initialize({ SolutionStackName: "64bit Amazon Linux 2014.09 v1.0.8 running Node.js" });
      }).then(function (env) {
        expect(env.envName).to.be.equal("enviro");
        expect(env.appName).to.be.equal("test-environment-init");
        return env.info();
      }).then(function (data) {
        expect(data.EnvironmentName).to.be.equal("enviro");
        done();
      }, done);
    });
    it("updates environment if already exists", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "test-environment-init2");
      app.initialize().then(function (app) {
        var env = new Environment(jackie._eb, "test-environment-init2", "enviro");
        return env.initialize({ SolutionStackName: "64bit Amazon Linux 2014.09 v1.0.8 running Node.js" });
      }).then(function (env) {
        return env.initialize({ Description: "my new desc" });
      }).then(function (env) {
        expect(env.envName).to.be.equal("enviro");
        expect(env.appName).to.be.equal("test-environment-init2");
        return env.info();
      }).then(function (data) {
        expect(data.EnvironmentName).to.be.equal("enviro");
        expect(data.Description).to.be.equal("my new desc");
        done();
      }, done);
    });
  });

  describe("Environment#info()", function () {
    it("returns current environment information", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "test-environment-init2");
      app.initialize().then(function (app) {
        var env = new Environment(jackie._eb, "test-environment-init2", "enviro");
        return env.initialize({
          SolutionStackName: "64bit Amazon Linux 2014.09 v1.0.8 running Node.js",
          CNAMEPrefix: "jackie-test-30534"
        });
      }).then(function (env) {
        return env.info();
      }).then(function (data) {
        expect(data.EnvironmentName).to.be.equal("enviro");
        expect(data.ApplicationName).to.be.equal("test-environment-init2");
        expect(data.Status).to.be.equal("Launching");
        expect(data.CNAME).to.be.equal("http://jackie-test-30534.elasticbeanstalk.com");
        done();
      }, done);
    });
  });
  
  describe("Environment#remove()", function () {
    it("removes current environment", function (done) {
      var jackie = this.jackie = new Jackie(utils.AWSConfig());
      var app = new Application(this.jackie._eb, "test-environment-init2");
      var env;
      app.initialize().then(function (app) {
        env = new Environment(jackie._eb, "test-environment-init2", "enviro");
        return env.initialize({
          SolutionStackName: "64bit Amazon Linux 2014.09 v1.0.8 running Node.js"
        });
      }).then(function (env) {
        return env.remove();
      }).then(function (data) {
        expect(data.Status).to.be.equal("Terminating");
        // Need to add polling for non-mock integration
        setTimeout(function () {
          env.info().then(function (data) {
            expect(data.Status).to.be.equal("Terminated");
            done();
          });
        }, 200);
      }, done);
    });
  });

  describe("Environment#update()", function () {
    
  });
});
