jackie
====

Jackie puts things in the [Elastic|Magic] Beanstalk.

The use case for Jackie is providing a way to define EB applications and environments at build time that can [blue-green deploy](http://martinfowler.com/bliki/BlueGreenDeployment.html) new Application Versions deployed to an AWS instance.

## Install

npm install jackie --save

## Usage

## API

```
var Jackie = require("jackie");

var jackie = new Jackie({ accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY });

// Setup
jackie.addApplication(fs.readFileSync(__dirname + "/examples/example.json, "utf-8").toString()).then(function () {
  console.log("Application added");
});

// ...

// Add a new version
jackie.getApplication

```

### Jackie

The `Jackie` object interacts with Elastic Beanstalk applications and deployments, and is the main entry point for the application.

#### new Jackie(config)

Creates a new `Jackie` instance. Pass in config the same as the [aws-sdk's AWS.ElasticBeanstalk](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticBeanstalk.html#constructor-property) constructor.

#### (Promise->Application) jackie.addApplication(definition)

Registers a new application definition with environment settings. An example definition manifest can be found in [./examples/example.json](https://github.com/jsantell/jackie/tree/master/examples/example.json). Creates a new `Application` and initializes it, creating the application on AWS if it doesn't yet exist. Returns a Promise that resolves to an `Application`.

An example definition manifest can be found in [./examples/example.json](https://github.com/jsantell/jackie/tree/master/examples/example.json). All of AWS's [Command Options](http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html) can be defined in the object as well.

#### (Application|null) jackie.getApplication(appName)

Returns the `Application` instance by name, as defined in the Application's definition.

#### (Promise) jackie.removeApplication(appName)

Removes application from AWS and from Jackie's internal store.

### Application

#### (Promise->ApplicationVersionDescription) application.addVersion(params)

Adds a new version of the application's artifact via S3 link. Parameters:

* `version` - string of the version label of this version.
* `description` - string description of this build.
* `bucket` - S3 bucket name where the artifact lives.
* `key` - S3 key on the bucket where the aritfact can be found.

#### (Promise->[EnvironmentDescription]) application.getEnvironments()

Returns a promise that returns an array of [EnvironmentDescription](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticBeanstalk.html#describeEnvironments-property) related to this application from AWS.

#### (Promise->EnvironmentDescription|null) application.getEnvironment(envName)

Returns a promise that returns an [EnvironmentDescription](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticBeanstalk.html#describeEnvironments-property) for the environment with `envName` that is associated with the current application.

#### (Promise) application.remove()

Removes application from AWS. Should **not** be called directly, but via the Jackie instance.

## License

Copyright 2014 Jordan Santell, MIT License
