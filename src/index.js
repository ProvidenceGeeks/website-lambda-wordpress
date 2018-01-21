/*
 * This script assumes AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are exported as environment variables
 */
const AWS = require('aws-sdk');
const fs = require('fs');
const http = require('https');
const isProduction = process.env.NODE_ENV === 'production';
const outputFile = 'wordpress-data.json';
const wordpressEndpoint = 'https://blog.pvdgeeks.org/wp-json/wp/v2/posts';
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

  Promise.all([getMediaData(), getAuthorData()]).then(results => {
    let mediaPromisesArray = results[0];
    let authorPromisesArray = results[1];
    let blogPostsData = getBlogPostsData();

    // Resolve array of promises for media data, and map to each blog post.
    Promise.all(mediaPromisesArray).then(mediaResults => {
      blogPostsData.then(blogPosts => {
        blogPosts.map(blogPost => {
          blogPost.media_details = mediaResults.find((mediaItem) => { // eslint-disable-line camelcase
            return mediaItem.id === blogPost.id;
          }).media_details; // eslint-disable-line camelcase
        });
      });
    });

    // Resolve array of promises for author data, and map to each blog post.
    Promise.all(authorPromisesArray).then(authorResults => {
      blogPostsData.then(blogPosts => {
        blogPosts.map(blogPost => {
          blogPost.author_name = authorResults.find((authorItem) => { // eslint-disable-line camelcase
            return authorItem.id === blogPost.id;
          }).author;
        });

        promiseResolver(blogPosts);
      });
    });
  });
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
  return getData(wordpressEndpoint)
    .then(function (results) {
      return results;
    })
    .catch(handleError);
}

function getMediaData() {
  let mediaList = [];

  return new Promise((resolve) => {
    getBlogPostsData()
      .then((blogPosts) => {
        blogPosts.map(post => {
          mediaList.push(new Promise((resolve) => {
            let hasMedia = post.featured_media > 0;
            let postMedia = {};

            if (hasMedia) {
              getData(post._links['wp:featuredmedia']['0'].href).then((results) => { // eslint-disable-line no-underscore-dangle
                postMedia.id = post.id;
                postMedia.media_details = results.media_details.sizes; // eslint-disable-line camelcase
                resolve(postMedia);
              });
            } else {
              resolve({
                id: post.id,
                media_details: {} // eslint-disable-line camelcase
              });
            }
          }));
        });
        resolve(mediaList);
      })
      .catch(handleError);
  });
}

function getAuthorData() {
  let authorList = [];
  let postAuthor = {};

  return new Promise((resolve) => {
    getBlogPostsData()
      .then((blogPosts) => {
        blogPosts.map(post => {
          authorList.push(new Promise((resolve) => {
            getData(post._links.author[0].href).then((results) => { // eslint-disable-line no-underscore-dangle
              postAuthor.id = post.id;
              postAuthor.author = results.name; // eslint-disable-line camelcase
              resolve(postAuthor);
              postAuthor = {};
            });
          }));
        });
        resolve(authorList);
      })
      .catch(handleError);
  });
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