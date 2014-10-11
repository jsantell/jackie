var assert = require("assert");
var _ = require("underscore");
var utils = require("./utils");
var Environment = require("./environment");

/**
 * Expose `Application`.
 */
module.exports = Application;

/**
 * `Application` constructor. Takes an `ElasticBeanstalk` wrapper instance.
 */
function Application (eb, definition) {
  this._eb = eb;
  this._environments = [];
  this.appName = definition.name;
  this.description = definition.description;

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
  var application = this;
  var params = {
    ApplicationName: this.appName,
    Description: this.description
  };

  return this._eb.describeApplications({ ApplicationNames: [this.appName] }).then(function (desc) {
    var appDesc = desc.Applications[0];

    // If application doesn't exist, create it
    if (!appDesc) {
      return application._eb.createApplication(params);
    }
    // If application description does not match, update it
    else if (appDesc.Description !== application.description) {
      return application.update(params);
    }
  }).then(function (description) {
    // Application should be good to go and sync'd at this point.
    return application;
  });
};

/**
 * Creates a new Environment object and tracks it internally within the application.
 *
 * @param {Object} envManifest
 * @return {Environment}
 */
Application.prototype.createEnvironment = function createEnvironment (envManifest) {
  var env = new Environment(this._eb, this.appName, envManifest);
  this._environments.push(env);
  return env;
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
 * @return {Promise->ApplicationVersionDescription}
 */

Application.prototype.addVersion = function addVersion (params) {
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

/**
 * Updates Application description.
 * @param {Object} params
 * - {String} description
 *
 * @return {Promise->ApplicationDescription}
 */

Application.prototype.update = function update (params) {
  params = _.extend({}, params, { ApplicationName: this.appName });
  return this._eb.updateApplication(params);
};

/**
 * Returns the Environment object matching `envName`.
 *
 * @param {String} envName
 *
 * @return {Environment|null}
 */

Application.prototype.getEnvironment = function getEnvironment (envName) {
  var envs = this._environments;
  for (var i = 0; i < envs.length; i++) {
    if (envs[i].envName === envName) {
      return envs[i];
    }
  }
  return null;
};

/**
 * Deploys `version` on `envName` environment. Environment creates and updates
 * the AWS resources as necessary.
 *
 * @param {String} envName
 * @param {String} version
 *
 * @return {Promise->Environment}
 */

Application.prototype.deploy = function deploy (envName, version) {
  var env = this.getEnvironment(envName);
  if (!env) {
    return when.resolve(null);
  }

  return env.deploy(version);
};

/**
 * Removes this application from AWS.
 *
 * @return {Promise}
 */

Application.prototype.remove = function remove () {
  return this._eb.deleteApplication({ ApplicationName: this.appName, TerminateEnvByForce: true }).then(function () {
    return null;
  });
};
