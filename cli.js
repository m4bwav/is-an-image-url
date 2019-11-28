#!/usr/bin/env node
'use strict';
const meow = require('meow');
const isAnImageUrl = require('.');

const cli = meow({
  help: [
    'Usage',
    '  $ is-an-image-url "<url>"',
    '',
    'Example',
    '  $ is-an-image-url "https://www.npmjs.com/static/images/collaboration-security.svg"'
  ]
});

const input = cli.input[0];

function init(url) {
  isAnImageUrl(url, isAnImageResult => {
    console.log(isAnImageResult);
  });
}

init(input);
