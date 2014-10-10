var assert = require("assert");
var _ = require("underscore");
var utils = require("./utils");

/**
 * Expose `Application`.
 */
module.exports = Application;

/**
 * `Application` constructor. Takes an `ElasticBeanstalk` wrapper instance, as
 * well as a manifest describing an application with its environments.
 */
function Application (eb, manifest) {
  this._eb = eb;
  this._manifest = manifest;
  this.appName = manifest.name;

  this._environments = [];

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
  var params = _.pick(this._manifest, ["name", "description"]);
  var application = this;

  return this._eb.describeApplications({ ApplicationNames: [this.appName] }).then(function (desc) {
    // If application exists, ensure that the details are up to date
    assert.equal(desc.Applications.length, 1, "One application description returned from describeApplication");
    var appDesc = desc.Applications[0];

    if (appDesc.Description !== params.description) {
      return application._update(params);
    }
  }, function (err) {
    console.log("ERROR", err);
    // If application doesn't exist, create it
    return application._eb.createApplication({
      ApplicationName: params.name,
      Description: params.description
    });
  }).then(function (description) {

    // Create all defined environments
    application._manifest.environments.forEach(application.createEnvironment.bind(application));

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

Application.prototype._update = function update (params) {
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
  return this._eb.removeApplication({ ApplicationName: this.appName, TerminateEnvByForce: true });
};
