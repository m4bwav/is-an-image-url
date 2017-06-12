'use strict';

const {URL} = require('url');
const request = require('request');
const isImage = require('is-image');
const isUrl = require('is-url');

const exports = {};
module.exports = exports;

function handleRequestResult(error, response, callback){
  if (error) {  
    callback(false);
  }
}

function requestUrlAndLookForImageHeader(url, callback, timeout){
  if (!timeout) {
    timeout = 20 * 1000;
  }

  request.get(url, {timeout}, (error, response) => {
    handleRequestResult(error, response, callback);
  });
}

function isUrlAnImageUrl(url, callback, timeout) {
  const urlObject = new URL(url);

  const path = urlObject.pathname;

  if (isImage(path)) {
    callback(true);
    return;
  }

  requestUrlAndLookForImageHeader(url, callback, timeout);
}

function isAnImageUrl(url, callback, timeout) {
  if (!callback) {
    return;
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

exports.isAnImageUrl = isAnImageUrl;
