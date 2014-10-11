var when = require("when");

exports.AWSConfig = function AWSConfig () {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: "us-west-1"
  }
};

/**
 * Clears out all applications from AWS.
 */
exports.clearAWS = function clearAWS (eb) {
  return eb.describeApplications().then(function (desc) {
    return when.all(desc.Applications.map(function (app) {
      return eb.deleteApplication({ TerminateEnvByForce: true, ApplicationName: app.ApplicationName });
    }));
  }).then(function () {
    return eb.describeApplications();
  }).then(function (desc) {
    var deferred = when.defer();
    if (desc.Applications.length) {
      exports.waitUntilDeleted(eb).then(deferred.resolve);
      return deferred.promise;
    }
  });
};

var RETRY = 2000;
exports.waitUntilDeleted = function waitUntilDeleted (eb) {
  var deferred = when.defer();

  eb.describeApplications().then(function (desc) {
    if (desc.Applications.length) {
      setTimeout(function () {
        exports.waitUntilDeleted(eb).then(deferred.resolve);
      }, RETRY);
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};
