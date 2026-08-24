'use strict';

module.exports = {
  spec: 'test/**/*.test.js',
  timeout: 15000,
  exit: true,        // force-exit after all tests — avoids Mongoose keeping the process open
  recursive: true,
  require: ['test/setup.js'],
};
