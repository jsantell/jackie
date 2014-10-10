var AWS = require("aws-sdk");
var lift = require("when/node").lift;

var EB_FUNCTIONS = [
  "createApplication",
  "describeApplications",
  "describeEnvironments",
  "createEnvironment",
  "swapEnvironmentCNAMEs"
];

function ElasticBeanstalk (config) {
  var _this = this;
  this._ebInstance = new AWS.ElasticBeanstalk(config || {});

  // Promisfy and bind all functions on helper `eb` function
  this._eb = {};
  EB_FUNCTIONS.forEach(function (fn) {
    _this._eb[fn] = lift(_this._ebInstance[fn].bind(_this._ebInstance));
  });
}
module.exports = ElasticBeanstalk;

/**
 * Creates an application on AWS.
 *
 * @param {Object} params
 * - {String} ApplicationName
 * - {String} Description
 */

ElasticBeanstalk.prototype.createApplication = function createApplication (params) {
  return this._eb.createApplication(params || {});
};

/**
 * Returns description of Applications on AWS.
 *
 * @param {Object} params
 * - {Array} ApplicationNames
 */

ElasticBeanstalk.prototype.describeApplications = function describeApplications (params) {
  return this._eb.describeApplications(params || {});
};

/**
 * Returns description of Environments on AWS.
 *
 * @param {Object} params
 * - {String} ApplicationName
 * - {[String]} EnvironmentIds
 * - {[String]} EnvironmentNames
 * - {Boolean} IncludeDeleted
 * - {Mixed} IncludeDeletedBackTo
 * - {String} VersionLabel
 */

ElasticBeanstalk.prototype.describeEnvironments = function describeEnvironments (params) {
  return this._eb.describeEnvironments(params || {});
};

/**
 * Creates an Environment on AWS.
 *
 * @param {Object} params
 * - {String} ApplicationName
 * - {String} CNAMEPrefix
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

ElasticBeanstalk.prototype.createEnvironment = function createEnvironment (params) {
  return this._eb.createEnvironment(params || {});
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
  return this._eb.updateEnvironment(params || {});
};

/**
 * Swaps two environments' CNAMES by name
 *
 * @param {Object}
 * - {String} DestinationEnvironmentName
 * - {String} SourceEnvironmentName
 */

ElasticBeanstalk.prototype.swapEnvironmentCNAMEs = function swapEnvironmentCNAMEs (params) {
  return this._eb.swapEnvironmentCNAMEs(params || {});
};
