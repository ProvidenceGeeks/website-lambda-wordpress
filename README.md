# website-lambda-wordpress

## Overview
Repository for Lambda functionality related to periodically fetching data from the Providence Geeks WordPress REST API. Built in Node.js.

## Project Setup
Please review the local development environment [steps](https://github.com/ProvidenceGeeks/website-docs/wiki/Onboarding-Guide#lambda) before getting started.

1. Import the project in your IDE.
2. In order to run the application (e.g. fetch wordpress data), run `yarn run fetch`

## Development
To test locally, run
```
yarn run fetch
```

To test against S3, `export` _AWS_ACCESS_KEY_ID_ and _AWS_SECRET_ACCESS_KEY_ and run
```
export NODE_ENV=production && yarn run fetch
```

All available tasks are in the *scripts* section of *package.json*.

## Release Management
Release management and procedure docs can be found in the [wiki](https://github.com/ProvidenceGeeks/website-docs/wiki/Release-Management)
