// src/controllers/__tests__/token.test.js
// Ensure crypto is imported; add status checks for signup/login to debug failures
import request from 'supertest';
import app from '../../index.js';
import { User } from '../../models/User.js';
import Session from '../../models/Session.js';
import mongoose from 'mongoose';
import { signToken } from '../../utils/jwt.js';
import crypto from 'crypto'; 
beforeEach(async () => {
  await User.deleteMany({});
  await Session.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Token Controller', () => {
  it('should refresh tokens and rotate successfully', async () => {
    const signupRes = await request(app)
      .post('/auth-local/signup')
      .send({ email: 'test@example.com', password: 'password123', name: 'Tester' });
    expect(signupRes.statusCode).toBe(201); // Add this to ensure signup succeeds

    const loginRes = await request(app)
      .post('/auth-local/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(loginRes.statusCode).toBe(200); // Add this to ensure login succeeds
    expect(loginRes.body.refreshToken).toBeDefined(); // Ensure refreshToken is returned

    const oldRefresh = loginRes.body.refreshToken;

    const refreshRes = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh });

    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(oldRefresh);

    const failRes = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(failRes.statusCode).toBe(401);
  });

  it('should reject invalid refresh token', async () => {
    const invalidRefresh = signToken({ id: new mongoose.Types.ObjectId() }, '7d');
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: invalidRefresh });
    expect(res.statusCode).toBe(401);
  });

  it('should reject expired session', async () => {
    const user = await User.create({
      name: 'Test',
      email: 'expire@test.com',
      password: 'password123', // Use plain password; model will hash it
      authMethods: ['email'],
    });
    const refreshToken = signToken({ id: user.id }, '7d');
    await Session.create({
      userId: user.id,
      refreshTokenHash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expiresAt: new Date(Date.now() - 1000), // Expired
    });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    expect(res.statusCode).toBe(401);
  });
});