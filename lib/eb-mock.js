var assert = require("assert");
var when = require("when");
var _ = require("underscore");

function ElasticBeanstalk (config) {
  this._applications = [];
  this._environments = [];
}
module.exports = ElasticBeanstalk;

ElasticBeanstalk.prototype.createApplication = function createApplication (params) {
  isNonEmptyString(params.ApplicationName);
  isNonEmptyString(params.Description);
  var app = {
    ApplicationName: params.ApplicationName,
    Description: params.Description,
    DateCreated: new Date(),
    DateUpdated: new Date(),
    Versions: [],
    ConfigurationTemplates: []
  };

  this._applications.push(app);
  return when.resolve(app);
};

ElasticBeanstalk.prototype.describeApplications = function describeApplications (params) {
  return when.resolve({ Applications: this._applications });
};

ElasticBeanstalk.prototype.createEnvironment = function createEnvironment (params) {
  var env = _.extend({}, params);
  ["VersionLabel", "ApplicationName", "CNAMEPrefix", "EnvironmentName"].forEach(function (p) {
    isNonEmptyString(env[p]);
    isNonEmptyString(env[p]);
  });

  if (env.OptionSettings) {
    assert(Array.isArray(env.OptionSettings));
    env.OptionSettings.forEach(function (option) {
      isNonEmptyString(option[Namespace]);
      isNonEmptyString(option[OptionName]);
      isNonEmptyString(option[Value]);
    });
  }
  
  if (env.OptionsToRemove) {
    assert(Array.isArray(env.OptionsToRemove));
    env.OptionsToRemove.forEach(function (option) {
      isNonEmptyString(option[Namespace]);
      isNonEmptyString(option[OptionName]);
    });
  }

  if (env.SolutionStackName) {
    isNonEmptyString(env.SolutionStackName);
    if (env.TemplateName) {
      return when.reject("Cannot specify both SolutionStackName and TemplateName");
    }
  }

  if (env.TemplateName) {
    isNonEmptyString(env.TemplateName);
    if (env.SolutionStackName) {
      return when.reject("Cannot specify both SolutionStackName and TemplateName");
    }
  }

  if (env.Tier) {
    isNonEmptyString(env.Tier.Name);
  }

  this._environments.push(env);
  return when.resolve(env);
};

ElasticBeanstalk.prototype.describeEnvironments = function describeEnvironments (params) {
  return when.resolve({ Environments: this._environments });
};

/**
 * Updates an Environment on AWS.
 *
 * @param {Object} params
 * - {String} EnvironmentId
 * - {String} EnvironmentName
 * - {String} Description
 * - {[OptionObjects]} OptionSettings
 *   - {String} Namespace
 *   - {String} OptionName
 *   - {String} Value
 * - {[OptionObjects]} OptionsToRemove
 *   - {String} Namespace
 *   - {String} OptionName
 * - {String} SolutionStackName
 * - {[TagObject]} Tags
 *   - {String} Key
 *   - {String} Value
 * - {Object} Tier
 *   - {String} Name
 * - {String} TemplateName
 * - {String} VersionLabel
 */

ElasticBeanstalk.prototype.updateEnvironment = function updateEnvironment (params) {
  return this.eb.updateEnvironment(params || {});
};

/**
 * Swaps two environments' CNAMES by name
 *
 * @param {Object}
 * - {String} DestinationEnvironmentName
 * - {String} SourceEnvironmentName
 */

ElasticBeanstalk.prototype.swapEnvironmentCNAMEs = function swapEnvironmentCNAMEs (params) {
  return this.eb.swapEnvironmentCNAMEs(params || {});
};

function isNonEmptyString (s) {
  assert(s);
  assert(typeof s === "string");
}
