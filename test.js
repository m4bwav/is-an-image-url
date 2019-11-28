import test from 'ava';
import isAnImageUrl from '.';

global.Promise = Promise;

const googleUrl = 'http://www.google.com';
const validImageUrl = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
const fourOhFourUrl = 'http://www.google.com/aa';

test.cb('Should work with a valid image url', t => {
  isAnImageUrl(validImageUrl, isImageCheckResult => {
    if (isImageCheckResult) {
      t.pass();
    } else {
      t.fail();
    }

    t.end();
  });
});

test.cb('Google.com should not be an image', t => {
  isAnImageUrl(googleUrl, isImageCheckResult => {
    if (isImageCheckResult) {
      t.fail();
    } else {
      t.pass();
    }

    t.end();
  });
});

test.cb('Won\'t work with an invalid url', t => {
  isAnImageUrl('afewaefaefwf', isImageCheckResult => {
    if (isImageCheckResult) {
      t.fail();
    } else {
      t.pass();
    }

    t.end();
  });
});

test.cb('Shouldn\'t work with a 404', t => {
  isAnImageUrl(fourOhFourUrl, isImageCheckResult => {
    if (isImageCheckResult) {
      t.fail();
    } else {
      t.pass();
    }

    t.end();
  });
});

test('Won\'t work without a callback', t => {
  try {
    isAnImageUrl(googleUrl);
  } catch {
    t.pass();
  }
});
