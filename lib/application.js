var assert = require("assert");
var _ = require("underscore");

function Application (eb, config) {
  this._eb = eb;
  this._config = config;
  this.appName = config.name;

  assert(this.appName);
}
exports.Application = Application;

/**
 * Checks to see if Application exists on AWS; creates it if it does not exist, and
 * updates the information accordingly.
 *
 * @return {Promise->Application}
 */
Application.prototype.initialize = function initialize () {
  var params = _.pick(this._config, ["name", "description"]);
  var application = this;

  return this._eb.describeApplications({ ApplicationNames: [this.appName] }).then(function (desc) {
    // If application exists, ensure that the details are up to date
    assert.equal(desc.Applications.length, 1, "One application description returned from describeApplication");
    var appDesc = desc.Applications[0];

    if (appDesc.Description !== params.description) {
      return application.update(params);
    }
  }, function (err) {
    // If application doesn't exist, create it
    return application._eb.createApplication(params);
  }).then(function (description) {
    // Application should be good to go and sync'd at this point.
    return application;
  });
};

Application.prototype.info = function info () {

};

/**
 * Updates Application description.
 * @param {Object} params
 * - {String} description
 *
 * @return {Promise}
 */

Application.prototype.update = function update (params) {
  params = _.extend({}, params, { ApplicationName: this.appName });
  return this._eb.updateApplication(params);
};

/**
 * Creates an ApplicationVersion of an app from S3 into this ElasticBeanstalk
 * Application.
 *
 * @param {Object} params
 * - {String} version
 * - {String} description
 * - {String} bucket
 * - {String} key
 *
 * @return {Promise}
 */

Application.prototype.addVersion = function deploy (params) {
  params = params || {};
  var p = {
    ApplicationName: this.appName,
    Description: params.description,
    VersionLabel: params.version,
    AutoCreateApplication: false, // Application should already be created
    SourceBundle: {
      S3Bucket: params.bucket,
      S3Key: params.key
    }
  };
  return this._eb.createApplicationVersion(p);
};
