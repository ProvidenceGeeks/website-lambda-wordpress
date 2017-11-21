/*
 * This script assumes AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are exported as environment variables
 */
const archiver = require('archiver');
const AWS = require('aws-sdk');
const fs = require('fs');
const zipOutput = './archive/blog-posts.zip';

archiveRelease(release);

function archiveRelease(onEnd) {

  // prep output directory
  fs.mkdirSync('./archive');

  const output = fs.createWriteStream(zipOutput);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  output.on('finish', function() {
    console.log('zip made, release it!'); // eslint-disable-line
    onEnd();
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);
  archive.file('./src/index.js', { name: 'index.js' });
  archive.finalize();
}

function release() {
  const s3 = new AWS.S3();
  const bucket = 'lambda.pvdgeeks.org';
  const key = 'blog-posts.zip';
  const upload = fs.readFileSync(zipOutput);

  s3.createBucket({ Bucket: bucket }, function(err) {

    if (err) {
      console.log(`ERROR: ${error}.  Should probably log this somewhere`); // eslint-disable-line
    } else {
      const params = {
        Bucket: bucket,
        Key: key,
        Body: upload,
        ACL: 'public-read'
      };

      s3.putObject(params, function(err) {
        if (err) {
          console.log(`ERROR: ${error}.  Should probably log this somewhere`); // eslint-disable-line
        } else {
          console.log(`Successfully uploaded data to ${bucket}/${key}`); // eslint-disable-line
        }
      });
    }
  });
}