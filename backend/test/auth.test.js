'use strict';

/**
 * auth.test.js
 *
 * Integration tests for the Auth routes:
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *
 * Uses mongodb-memory-server — no real Atlas connection needed.
 */

const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const db = require('./helpers/db');

// ─── Helpers ────────────────────────────────────────────────────────────────

const BASE = '/api/auth';

/** Convenience: sign up a user and return the parsed body. */
async function signupUser(payload) {
  return request(app).post(`${BASE}/signup`).send(payload);
}

/** Convenience: log in a user and return the parsed body. */
async function loginUser(email, password) {
  return request(app).post(`${BASE}/login`).send({ email, password });
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Auth Routes', function () {
  this.timeout(15000); // some MMS operations can be slow on first run

  before(async () => {
    await db.connect();
  });

  afterEach(async () => {
    // Wipe all users between test cases for full isolation
    await db.clearDatabase();
  });

  after(async () => {
    await db.disconnect();
  });

  // ── POST /api/auth/signup ──────────────────────────────────────────────────

  describe('POST /api/auth/signup', () => {
    it('201 — valid signup returns token and user object', async () => {
      const res = await signupUser({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret123',
      });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token').that.is.a('string');
      expect(res.body.user).to.include({ name: 'Alice', email: 'alice@example.com' });
      expect(res.body.user).to.not.have.property('password');
    });

    it('400 — missing name field', async () => {
      const res = await signupUser({ email: 'x@x.com', password: 'pass123' });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('message');
    });

    it('400 — missing email field', async () => {
      const res = await signupUser({ name: 'Bob', password: 'pass123' });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('message');
    });

    it('400 — missing password field', async () => {
      const res = await signupUser({ name: 'Bob', email: 'bob@example.com' });
      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('message');
    });

    it('400 — password shorter than 6 characters', async () => {
      const res = await signupUser({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'abc',
      });
      expect(res.status).to.equal(400);
      expect(res.body.message).to.match(/6 char/i);
    });

    it('400 — password exactly 5 characters (boundary)', async () => {
      const res = await signupUser({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'ab123',
      });
      expect(res.status).to.equal(400);
    });

    it('201 — password exactly 6 characters (boundary)', async () => {
      const res = await signupUser({
        name: 'Bob',
        email: 'bob@example.com',
        password: 'abc123',
      });
      expect(res.status).to.equal(201);
    });

    it('409 — duplicate email returns conflict', async () => {
      const payload = { name: 'Carol', email: 'carol@example.com', password: 'password1' };
      // First signup should succeed
      await signupUser(payload);
      // Second signup with same email must return 409
      const res = await signupUser(payload);
      expect(res.status).to.equal(409);
      expect(res.body.message).to.match(/already registered/i);
    });

    it('409 — race condition: concurrent signups with same email resolve to one success + one 409', async () => {
      const payload = { name: 'Dave', email: 'dave@example.com', password: 'password1' };
      // Fire two requests "simultaneously"
      const [r1, r2] = await Promise.all([signupUser(payload), signupUser(payload)]);
      const statuses = [r1.status, r2.status].sort();
      expect(statuses).to.deep.equal([201, 409]);
    });
  });

  // ── POST /api/auth/login ───────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    const credentials = {
      name: 'Eve',
      email: 'eve@example.com',
      password: 'mypassword',
    };

    beforeEach(async () => {
      // Each login test needs a registered user
      await signupUser(credentials);
    });

    it('200 — valid credentials return token and user object', async () => {
      const res = await loginUser(credentials.email, credentials.password);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token').that.is.a('string');
      expect(res.body.user).to.include({ email: credentials.email });
    });

    it('401 — wrong password', async () => {
      const res = await loginUser(credentials.email, 'wrongpassword');
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('message');
    });

    it('401 — non-existent email', async () => {
      const res = await loginUser('nobody@example.com', 'password123');
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('message');
    });

    it('400 — missing email in login body', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ password: 'mypassword' });
      expect(res.status).to.equal(400);
    });

    it('400 — missing password in login body', async () => {
      const res = await request(app)
        .post(`${BASE}/login`)
        .send({ email: credentials.email });
      expect(res.status).to.equal(400);
    });
  });

  // ── POST /api/auth/logout ──────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    let validToken;

    beforeEach(async () => {
      // Register and immediately log in to get a fresh token
      await signupUser({ name: 'Frank', email: 'frank@example.com', password: 'frank123' });
      const loginRes = await loginUser('frank@example.com', 'frank123');
      validToken = loginRes.body.token;
    });

    it('200 — logout succeeds with a valid token', async () => {
      const res = await request(app)
        .post(`${BASE}/logout`)
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.message).to.match(/logged out/i);
    });

    it('401 — old token is rejected on a subsequent protected request (tokenVersion invalidated)', async () => {
      // Log out → increments tokenVersion
      await request(app)
        .post(`${BASE}/logout`)
        .set('Authorization', `Bearer ${validToken}`);

      // Now try to use the OLD token on a protected route
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).to.equal(401);
      expect(res.body.message).to.match(/session expired/i);
    });

    it('401 — logout without Authorization header returns 401', async () => {
      const res = await request(app).post(`${BASE}/logout`);
      expect(res.status).to.equal(401);
    });

    it('401 — logout with a malformed token returns 401', async () => {
      const res = await request(app)
        .post(`${BASE}/logout`)
        .set('Authorization', 'Bearer this.is.not.a.valid.jwt');
      expect(res.status).to.equal(401);
    });
  });
});
