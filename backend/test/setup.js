'use strict';

/**
 * test/setup.js
 *
 * Global test setup — loaded by mocha BEFORE any test suite via .mocharc.cjs `require`.
 * Loads environment variables from the root .env file so that JWT_SECRET, MONGO_URI, etc.
 * are available to the app modules even though index.js (which calls dotenv.config()) is
 * never executed during test runs.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
