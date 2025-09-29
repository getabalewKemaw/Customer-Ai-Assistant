// src/models/__tests__/user.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../User.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { dbName: 'test' });
  // ensure indexes are built before tests relying on uniqueness
  await User.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

test('create email/password user and hash password', async () => {
  const u = await User.create({
    name: 'Alice',
    email: 'alice@example.com',
    password: 'secret123',
    authMethods: ['email'],
  });

  expect(u.password).toBeDefined();
  expect(u.password).not.toBe('secret123'); // hashed
  const match = await u.comparePassword('secret123');
  expect(match).toBe(true);
});

test('create google-only user (no password)', async () => {
  const g = await User.create({
    name: 'Google Bob',
    email: 'bob@gmail.com',
    googleId: 'g-12345',
    authMethods: ['google'],
  });

  expect(g.googleId).toBe('g-12345');
  expect(g.password).not.toBeDefined();
  const found = await User.findOne({ googleId: 'g-12345' });
  expect(found).not.toBeNull();
});

test('prevent duplicate emails (unique index)', async () => {
  await User.create({
    name: 'A',
    email: 'dup@example.com',
    password: 'one',
    authMethods: ['email'],
  });

  await expect(
    User.create({
      name: 'B',
      email: 'dup@example.com',
      password: 'two',
      authMethods: ['email'],
    })
  ).rejects.toThrow();
});

test('googleId is unique (sparse index) and linking works', async () => {
  // two users without googleId allowed
  await User.create({ name: 'NoG1', email: 'nog1@example.com', authMethods: ['email'] });
  await User.create({ name: 'NoG2', email: 'nog2@example.com', authMethods: ['email'] });

  // create first google user
  await User.create({ name: 'G1', email: 'g1@example.com', googleId: 'ggg', authMethods: ['google'] });

  // duplicate googleId should error
  await expect(
    User.create({ name: 'G2', email: 'g2@example.com', googleId: 'ggg', authMethods: ['google'] })
  ).rejects.toThrow();
});

test('findOrCreateByGoogle links to existing email account', async () => {
  const existing = await User.create({
    name: 'LinkMe',
    email: 'link@example.com',
    password: 'pw',
    authMethods: ['email'],
  });

  const linked = await User.findOrCreateByGoogle({
    googleId: 'link-gg',
    email: 'link@example.com',
    name: 'LinkMe From Google',
    profilePicture: 'http://pic',
    emailVerified: true,
  });

  expect(linked._id.toString()).toBe(existing._id.toString());
  expect(linked.googleId).toBe('link-gg');
  expect(linked.authMethods).toEqual(expect.arrayContaining(['email', 'google']));
});

