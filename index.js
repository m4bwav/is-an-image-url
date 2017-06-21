'use strict';

const urlLib = require('url');
const request = require('request');
const isImage = require('is-image');
const isUrl = require('is-url');

function handleRequestResult(error, response, callback) {
  if (error || !response || !response.headers) {
    callback(false);
    return;
  }

  const contentType = response.headers['content-type'];

  const hasImageContentType = contentType && contentType.search(/^image\//) !== -1;

  callback(hasImageContentType);
}

function requestUrlAndLookForImageHeader(url, callback, timeout) {
  if (!timeout) {
    timeout = 20 * 1000;
  }

  try {
    request.get(url, {timeout}, (error, response) => {
      handleRequestResult(error, response, callback);
    });
  } catch (err) {
    callback(false);
  }
}

function isUrlAnImageUrl(url, callback, timeout) {
  const urlObject = urlLib.parse(url);

  const path = urlObject.pathname;

  if (isImage(path)) {
    callback(true);
    return;
  }

  requestUrlAndLookForImageHeader(url, callback, timeout);
}

function isAnImageUrl(url, callback, timeout) {
  if (!callback) {
    throw new Error('Callback must be set to receive the result of the image check.');
  }

  if (!url) {
    callback(false);
    return;
  }

  if (!isUrl(url)) {
    const result = isImage(url);

    callback(result);
    return;
  }

  isUrlAnImageUrl(url, callback, timeout);
}

module.exports = isAnImageUrl;
