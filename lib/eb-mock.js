var assert = require("assert");
var when = require("when");
var _ = require("underscore");

/*
 * error:
 *{ [AccessDenied: User: arn:aws:iam::325881430661:user/jackie_test is not authorized to perform: elasticbeanstalk:CreateApplication on resource: arn:aws:elasticbeanstalk:us-west-1:325881430661:application/test-app]
   message: 'User: arn:aws:iam::325881430661:user/jackie_test is not authorized to perform: elasticbeanstalk:CreateApplication on resource: arn:aws:elasticbeanstalk:us-west-1:325881430661:application/test-app',
     code: 'AccessDenied',
       time: Fri Oct 10 2014 14:25:34 GMT-0700 (PDT),
         statusCode: 403,
           retryable: false }
 *
 *
 */

function addMetadata (res) {
  res.ResponseMetadata = { RequestId: "fe34acee-50c2-11e4-ab51-dfcbdabfe705" };
  return Object.freeze(res);
}

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
  return when.resolve(addMetadata({ Application: app }));
};

ElasticBeanstalk.prototype.updateApplication = function updateApplication (params) {
  var apps = this._applications;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].ApplicationName === params.ApplicationName) {
      apps[i].Description = params.Description;
      return when.resolve(addMetadata({}));
    }
  }
  return when.resolve(addMetadata({}));
};

ElasticBeanstalk.prototype.deleteApplication = function deleteApplication (params) {
  var apps = this._applications;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].ApplicationName === params.ApplicationName) {
      apps.slice(i, 1);
      return when.resolve(addMetadata({}));
    }
  }
  return when.resolve(addMetadata({}));
};

ElasticBeanstalk.prototype.describeApplications = function describeApplications (params) {
  return when.resolve(addMetadata({ Applications: this._applications }));
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
