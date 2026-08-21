'use strict';

/**
 * notes.test.js
 *
 * Integration tests for the Notes routes (all protected by JWT):
 *   POST   /api/notes
 *   GET    /api/notes
 *   GET    /api/notes/:id
 *   PUT    /api/notes/:id
 *   DELETE /api/notes/:id
 *
 * Uses mongodb-memory-server — no real Atlas connection needed.
 */

const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const db = require('./helpers/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTH_BASE = '/api/auth';
const NOTES_BASE = '/api/notes';

/**
 * Create and log in a fresh test user, returning { token, userId }.
 * Each call uses a unique email so tests don't collide.
 */
let userCounter = 0;
async function createAndLoginUser() {
  userCounter += 1;
  const email = `testuser${userCounter}@notes.test`;
  const password = 'TestPass1!';
  const name = `TestUser${userCounter}`;

  const signupRes = await request(app)
    .post(`${AUTH_BASE}/signup`)
    .send({ name, email, password });

  if (signupRes.status !== 201) {
    throw new Error(`Signup failed (${signupRes.status}): ${JSON.stringify(signupRes.body)}`);
  }

  return { token: signupRes.body.token, userId: signupRes.body.user.id };
}

/**
 * Create a note for a given user and return its parsed body.
 */
async function createNote(token, title = 'My Note Title', content = 'My note content here') {
  const res = await request(app)
    .post(NOTES_BASE)
    .set('Authorization', `Bearer ${token}`)
    .send({ title, content });
  return res;
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Notes Routes', function () {
  this.timeout(15000);

  /** Primary test user (User A) */
  let tokenA;

  /** Secondary test user (User B) — used to verify ownership isolation */
  let tokenB;

  /** A note owned by User A, set up in beforeEach */
  let noteA;

  before(async () => {
    await db.connect();
  });

  beforeEach(async () => {
    // Fresh users and a starter note for every test
    ({ token: tokenA } = await createAndLoginUser());
    ({ token: tokenB } = await createAndLoginUser());

    const res = await createNote(tokenA, 'User A Note', 'Content for User A');
    noteA = res.body; // { _id, title, content, owner, ... }
  });

  afterEach(async () => {
    await db.clearDatabase();
  });

  after(async () => {
    await db.disconnect();
  });

  // ── 401 on every route without Authorization header ────────────────────────

  describe('Unauthenticated requests return 401', () => {
    it('POST /api/notes → 401', async () => {
      const res = await request(app).post(NOTES_BASE).send({ title: 'T', content: 'C' });
      expect(res.status).to.equal(401);
    });

    it('GET /api/notes → 401', async () => {
      const res = await request(app).get(NOTES_BASE);
      expect(res.status).to.equal(401);
    });

    it('GET /api/notes/:id → 401', async () => {
      const res = await request(app).get(`${NOTES_BASE}/${noteA._id}`);
      expect(res.status).to.equal(401);
    });

    it('PUT /api/notes/:id → 401', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .send({ title: 'Updated' });
      expect(res.status).to.equal(401);
    });

    it('DELETE /api/notes/:id → 401', async () => {
      const res = await request(app).delete(`${NOTES_BASE}/${noteA._id}`);
      expect(res.status).to.equal(401);
    });
  });

  // ── POST /api/notes ────────────────────────────────────────────────────────

  describe('POST /api/notes', () => {
    it('201 — valid note creation returns the note object', async () => {
      const res = await createNote(tokenA, 'Test Title', 'Test Content');
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('_id');
      expect(res.body.title).to.equal('Test Title');
      expect(res.body.content).to.equal('Test Content');
    });

    it('400 — missing title', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Some content' });
      expect(res.status).to.equal(400);
    });

    it('400 — missing content', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Some title' });
      expect(res.status).to.equal(400);
    });

    it('400 — empty title (whitespace only)', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '   ', content: 'Some content' });
      expect(res.status).to.equal(400);
    });

    it('400 — empty content (whitespace only)', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Some title', content: '   ' });
      expect(res.status).to.equal(400);
    });

    it('400 — non-string title', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 12345, content: 'Some content' });
      expect(res.status).to.equal(400);
    });

    it('400 — empty body', async () => {
      const res = await request(app)
        .post(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});
      expect(res.status).to.equal(400);
    });

    it('201 — title/content are trimmed before saving', async () => {
      const res = await createNote(tokenA, '  Trimmed Title  ', '  Trimmed Content  ');
      expect(res.status).to.equal(201);
      expect(res.body.title).to.equal('Trimmed Title');
      expect(res.body.content).to.equal('Trimmed Content');
    });
  });

  // ── GET /api/notes ─────────────────────────────────────────────────────────

  describe('GET /api/notes', () => {
    it('200 — returns an array of the logged-in user\'s own notes', async () => {
      const res = await request(app)
        .get(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
      // The beforeEach created one note for User A
      expect(res.body.length).to.be.at.least(1);
      res.body.forEach((note) => {
        expect(note.owner.toString()).to.equal(noteA.owner.toString());
      });
    });

    it('200 — does NOT return notes belonging to other users', async () => {
      // Create a note for User B
      await createNote(tokenB, 'User B Note', 'User B Content');

      // Fetch notes as User A
      const res = await request(app)
        .get(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).to.equal(200);
      // None of User A's notes should belong to User B
      const ownerIds = res.body.map((n) => n.owner.toString());
      ownerIds.forEach((ownerId) => {
        expect(ownerId).to.equal(noteA.owner.toString());
      });
    });

    it('200 — returns empty array when user has no notes', async () => {
      const res = await request(app)
        .get(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').that.is.empty;
    });
  });

  // ── GET /api/notes/:id ─────────────────────────────────────────────────────

  describe('GET /api/notes/:id', () => {
    it('200 — owner can fetch their own note by id', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).to.equal(200);
      expect(res.body._id).to.equal(noteA._id);
    });

    it('404 — fetching another user\'s note returns 404', async () => {
      // User B tries to fetch User A's note
      const res = await request(app)
        .get(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).to.equal(404);
    });

    it('404 — non-existent (but valid) ObjectId returns 404', async () => {
      const fakeId = '000000000000000000000001'; // valid ObjectId format, but doesn't exist
      const res = await request(app)
        .get(`${NOTES_BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).to.equal(404);
    });

    it('400 or 404 — malformed id returns an error status', async () => {
      const res = await request(app)
        .get(`${NOTES_BASE}/not-a-valid-id`)
        .set('Authorization', `Bearer ${tokenA}`);
      // CastError → errorHandler maps to 400; application may also return 404
      expect([400, 404]).to.include(res.status);
    });
  });

  // ── PUT /api/notes/:id ─────────────────────────────────────────────────────

  describe('PUT /api/notes/:id', () => {
    it('200 — owner can update title only', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Updated Title' });
      expect(res.status).to.equal(200);
      expect(res.body.title).to.equal('Updated Title');
      expect(res.body.content).to.equal(noteA.content); // content unchanged
    });

    it('200 — owner can update content only', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Updated Content' });
      expect(res.status).to.equal(200);
      expect(res.body.content).to.equal('Updated Content');
      expect(res.body.title).to.equal(noteA.title); // title unchanged
    });

    it('200 — owner can update both title and content', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'New Title', content: 'New Content' });
      expect(res.status).to.equal(200);
      expect(res.body.title).to.equal('New Title');
      expect(res.body.content).to.equal('New Content');
    });

    it('400 — empty body (no title or content fields)', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});
      expect(res.status).to.equal(400);
    });

    it('400 — title field is whitespace only', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: '   ' });
      expect(res.status).to.equal(400);
    });

    it('400 — content field is whitespace only', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '   ' });
      expect(res.status).to.equal(400);
    });

    it('404 — another user cannot update the note', async () => {
      const res = await request(app)
        .put(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'Hijacked' });
      expect(res.status).to.equal(404);
    });

    it('404 — non-existent note id returns 404', async () => {
      const fakeId = '000000000000000000000002';
      const res = await request(app)
        .put(`${NOTES_BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ title: 'Ghost Update' });
      expect(res.status).to.equal(404);
    });
  });

  // ── DELETE /api/notes/:id ──────────────────────────────────────────────────

  describe('DELETE /api/notes/:id', () => {
    it('200 — owner can delete their note', async () => {
      const res = await request(app)
        .delete(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).to.equal(200);
      expect(res.body.message).to.match(/deleted/i);
    });

    it('200 — deleted note no longer appears in GET /api/notes', async () => {
      await request(app)
        .delete(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      const listRes = await request(app)
        .get(NOTES_BASE)
        .set('Authorization', `Bearer ${tokenA}`);
      const ids = listRes.body.map((n) => n._id);
      expect(ids).to.not.include(noteA._id);
    });

    it('404 — another user cannot delete the note', async () => {
      const res = await request(app)
        .delete(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).to.equal(404);
    });

    it('404 — non-existent note id returns 404', async () => {
      const fakeId = '000000000000000000000003';
      const res = await request(app)
        .delete(`${NOTES_BASE}/${fakeId}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).to.equal(404);
    });

    it('404 — double-delete returns 404 on second attempt', async () => {
      await request(app)
        .delete(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      const res = await request(app)
        .delete(`${NOTES_BASE}/${noteA._id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).to.equal(404);
    });
  });
});
