# is-an-image-url
[![npm package](https://nodei.co/npm/is-an-image-url.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/is-an-image-url/)

[![Build Status](https://img.shields.io/travis/m4bwav/is-an-image-url/master.svg)](https://travis-ci.org/m4bwav/is-an-image-url)
[![Dependency Status](https://img.shields.io/david/m4bwav/is-an-image-url.svg)](https://david-dm.org/m4bwav/is-an-image-url)
[![Coverage Status](https://img.shields.io/coveralls/m4bwav/is-an-image-url/master.svg)](https://coveralls.io/github/m4bwav/is-an-image-url?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/npm/is-an-image-url/badge.svg?style=flat-square)](https://snyk.io/test/npm/is-an-image-url)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![Gitter](https://badges.gitter.im/m4bwav/is-an-image-url.svg)](https://gitter.im/m4bwav/is-an-image-url?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)  
  
[![NPM](https://nodei.co/npm-dl/is-an-image-url.png?months=3)](https://nodei.co/npm/is-an-image-url/)

This package was originally created as an async replacement for is-image-url.  I was using that one but my sync security scanner said there was issue with one of the dependencies.  I posted a pull request but a new version never got published, so onward and upward.  The other lib was synchronous, I figured I'd make an async version.


## Installation

Installation is easiest through npm:

`npm install is-an-image-url --save`


## Usage

**is-an-image-url** can be included as a reference.

```
var isAnImageUrl = require('is-an-image-url');

isAnImageUrl(url, function(isAnImageResult){
  if(isAnImageResult){
      console.log("yes the url was an image");
  }else {
      console.log("no, the url was not an image");
  }
});
```

## CLI

```
$ npm install --global is-an-image-url
```

```
$ is-an-image-url --help

  Usage
    $ is-an-image-url "<url>"

  Example
    $ is-an-image-url "http://www.google.com"
```

The isAnImageUrl will use the callback function with the following signature callback(isAnImageResult).
`isAnImageResult` will be a bool, true if the url is for an image and false otherwise.
## License

MIT © [Mark Rogers](http://www.markdavidrogers.com)