var EBMock = require("eb-mock");
var AWS = require("aws-sdk");
var defer = require("when").defer;
var log = true;

var EB_FUNCTIONS = [
  "createApplication",
  "describeApplications",
  "describeEnvironments",
  "createEnvironment",
  "swapEnvironmentCNAMEs",
  "deleteApplication",
  "updateApplication",
  "createApplicationVersion",
  "listAvailableSolutionStacks",
  // S3 methods only in mock mode
  "putObject",
  "createBucket"
];

function ElasticBeanstalk (config) {
  this.mock = config.mock;
  this._ebInstance = config.mock ? new EBMock : new AWS.ElasticBeanstalk(config || {});
}
module.exports = ElasticBeanstalk;

EB_FUNCTIONS.forEach(function (fn) {
  ElasticBeanstalk.prototype[fn] = function (params) {
    if ((fn === "putObject" || fn === "createBucket") && !this.mock) {
      throw new Error(this + " has no method " + fn);
    }
    var deferred = defer();
    this._ebInstance[fn](params || {}, function (err, data) {
      // Super hacky logging
      if (log) {
        if (err)
          console.log("LOGGING " + fn + ": ERROR: ", err, data);
        else
          console.log("LOGGING " + fn + ": ", data);
      }
      if (err) deferred.reject(err);
      else deferred.resolve(data);
    });
    return deferred.promise;
  };
});
