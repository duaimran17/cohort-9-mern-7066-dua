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
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

module.exports = { connect, clearDatabase, disconnect };
