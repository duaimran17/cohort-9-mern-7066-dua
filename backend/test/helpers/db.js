'use strict';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

/**
 * Start an in-memory MongoDB instance and connect Mongoose to it.
 * Safely disconnects any pre-existing connection first so that two test
 * suites running in the same mocha process don't conflict.
 * Call this in a `before()` hook at the top of each test suite.
 */
async function connect() {
  try {
    // Disconnect from any previous connection (e.g., if another test suite ran first)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }

    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  } catch (error) {
    const server = mongod;
    mongod = null;
    if (server) {
      try {
        await server.stop();
      } catch (cleanupError) {
        // Preserve the original startup error — don't let cleanup failure mask it
      }
    }
    throw error;
  }
}

/**
 * Drop all collections so each test case starts with a clean slate.
 * Call this in an `afterEach()` hook for per-test isolation.
 */
async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Disconnect Mongoose and stop the in-memory server.
 * Call this in an `after()` hook at the end of each test suite.
 */
async function disconnect() {
  let firstError = null;

  try {
    await mongoose.connection.dropDatabase();
  } catch (error) {
    firstError = error;
  }

  try {
    await mongoose.connection.close();
  } catch (error) {
    if (!firstError) firstError = error;
  }

  const server = mongod;
  mongod = null;
  if (server) {
    try {
      await server.stop();
    } catch (error) {
      if (!firstError) firstError = error;
    }
  }

  if (firstError) throw firstError;
}

module.exports = { connect, clearDatabase, disconnect };
