var REGION = "us-west-1";
var fs = require("fs");
var when = require("when");
var AWS = require("aws-sdk");
var _ = require("underscore");

exports.useMocks = function useMocks () {
  return process.env["JACKIE_TESTS_MOCK"] === "true";
};

exports.AWSConfig = function AWSConfig () {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: REGION,
    mock: exports.useMocks()
  }
};

exports.addFileToBucket = function addFileToBucket (eb, bucket, key, file) {
  if (exports.useMocks()) {
    return eb.createBucket({ Bucket: bucket }).then(function () {
      return eb.putObject({
        Bucket: bucket,
        Key: key,
        Body: fs.readFileSync(file)
      });
    });
  }
  else {
    var deferred = when.defer();
    var s3 = new AWS.S3(_.pick(["accessKeyId", "secretAccessKey", "region"], exports.AWSConfig()));
    s3.createBucket({ CreateBucketConfiguration: { LocationConstraint: REGION }, Bucket: bucket }, function (err, data) {
      if (err && !/BucketAlreadyExists/.test(err) && !/BucketAlreadyOwnedByYou/.test(err)) {
        return deferred.reject(err);
      }
      s3.putObject({ Bucket: bucket, Key: key, Body: fs.readFileSync(file) }, function (err, data) {
        if (err) return deferred.reject(err);
        deferred.resolve(data);
      });
    });
    return deferred.promise;
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
