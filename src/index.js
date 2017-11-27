/*
 * This script assumes AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are exported as environment variables
 */
const AWS = require('aws-sdk');
const fs = require('fs');
const http = require('http');
const isProduction = process.env.NODE_ENV === 'production';
const outputFile = 'wordpress-data.json';
const s3Config = {
  bucket: 'data.pvdgeeks.org',
  key: 'wordpress'
};

// expose handler for Lambda
exports.run = run;

if (!isProduction) {
  run();
}

function run() {
  const promiseResolver = isProduction ? resolveBlogPostsDataS3 : resolveBlogPostsDataLocal;

  getBlogPostsData()
    .then(promiseResolver)
    .catch(handleError);
}

function resolveBlogPostsDataLocal(results) {
  const outputBase = './output';
  const outputPath = `${outputBase}/${outputFile}`;

  if (!fs.existsSync(outputBase)) {
    fs.mkdirSync(outputBase);
  }

  fs.writeFileSync(outputPath, formatResults(results));

  console.log(`Successfully output data to ${outputPath}`); // eslint-disable-line
}

function resolveBlogPostsDataS3(results) {
  const s3 = new AWS.S3();
  const key = `${s3Config.key}/${outputFile}`;

  s3.createBucket({ Bucket: s3Config.bucket }, function(err) {

    if (err) {
      handleError(err);
    } else {
      const params = {
        Bucket: s3Config.bucket,
        Key: key,
        Body: formatResults(results),
        ACL: 'public-read'
      };

      s3.putObject(params, function(err) {
        if (err) {
          handleError(err);
        } else {
          console.log(`Successfully uploaded data to ${s3Config.bucket}/${key}`); // eslint-disable-line
        }
      });
    }
  });
}

function getBlogPostsData() {
  return getData('http://blog.pvdgeeks.org/wp-json/wp/v2/posts')
    .then(function (results) {
      return results;
    })
    .catch(handleError);
}

function getData(url) {
  return new Promise(function(resolve, reject) {

    http.get(url, (resp) => {
      let data = '';

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        resolve(JSON.parse(data));
      });
    }).on('error', (err) => {
      reject(handleError(err));
    });
  });
}

function formatResults(results) {
  results = [].concat.apply([], results);

  return JSON.stringify(results, null, 2);
}

function handleError(error) {
  console.log(`ERROR: ${error}.  Should probably log this somewhere`); // eslint-disable-line
}