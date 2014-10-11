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
  "createApplicationVersion"
];

function ElasticBeanstalk (config) {
  this._ebInstance = new AWS.ElasticBeanstalk(config || {});
}
module.exports = ElasticBeanstalk;

EB_FUNCTIONS.forEach(function (fn) {
  ElasticBeanstalk.prototype[fn] = function (params) {
    var deferred = defer();
    this._ebInstance[fn](params || {}, function (err, data) {
      // Super hacky logging
      if (log) {
        if (err)
          console.log("LOGGING " + fn + ": ERROR: ", err);
        else
          console.log("LOGGING " + fn + ": ", data);
      }
      if (err) deferred.reject(err);
      else deferred.resolve(data);
    });
    return deferred.promise;
  };
});
