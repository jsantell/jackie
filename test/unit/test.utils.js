var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var expect = require("chai").expect;
var utils = require("../../lib/utils");

var app1Manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "/../fixtures/app1.json"), "utf8").toString());

describe("unit - utils.js", function () {
  it("getEnvConfig()", function () {
    var result = utils.getEnvConfig(app1Manifest.name, app1Manifest.environments[0]);
    expect(result.ApplicationName).to.be.equal("test-app");
    expect(result.EnvironmentName).to.be.equal("my-test-env");
    expect(result.CNAMEPrefix).to.be.equal("my-test-env-cname");
    expect(result.Description).to.be.equal("test-env's description");
    expect(result.Tier.Name).to.be.equal("Web Server");
    expect(result.Tags.length).to.be.equal(2);
    expect(result.Tags[0].Key).to.be.equal("keytag1");
    expect(result.Tags[0].Value).to.be.equal("value1");
    expect(result.Tags[1].Key).to.be.equal("keytag2");
    expect(result.Tags[1].Value).to.be.equal("value2");
    expect(result.SolutionStackName).to.be.equal("64bit Amazon Linux 2014.02 running Node.js");
    expect(result.OptionSettings.length).to.be.equal(42);
    
    var op1 = _.findWhere(result.OptionSettings, { OptionName: "InstanceType" });
    expect(op1.Namespace).to.be.equal("aws:autoscaling:launchconfiguration");
    expect(op1.OptionName).to.be.equal("InstanceType");
    expect(op1.Value).to.be.equal("m1.small");
  });
});
