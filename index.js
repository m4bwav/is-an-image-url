'use strict';

const request = require('request');
const isImage = require('is-image');
const isUrl = require('is-url');

var exports = module.exports = {};

function replacePlainLinks(url, callback) {
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

  request();
}

exports.replacePlainLinks = replacePlainLinks;
