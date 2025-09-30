// src/models/__tests__/session.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Session from '../Session.js';
import crypto from 'crypto';
import { signToken } from '../../utils/jwt.js';

let mongoServer;
const SEVEN_DAYS = 7 * 24 * 60 * 60; // seconds

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri, { dbName: 'test' });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await Session.deleteMany({});
});

describe('Session Model', () => {
    it('should create a session with hashed refresh token', async () => {
        const userId = new mongoose.Types.ObjectId();
        const refreshToken = signToken({ id: userId }, '7d');
        const deviceInfo = 'test-device';

        const session = await Session.createSession(
            userId,
            refreshToken,
            deviceInfo,
            SEVEN_DAYS
        );

        expect(session.refreshTokenHash).toBeDefined();
        const expectedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        expect(session.refreshTokenHash).toBe(expectedHash);
        expect(session.deviceInfo).toBe(deviceInfo);
        expect(session.expiresAt).toBeInstanceOf(Date);
    });

    it('should validate a valid refresh token', async () => {
        const userId = new mongoose.Types.ObjectId();
        const refreshToken = signToken({ id: userId }, '7d');
        await Session.createSession(userId, refreshToken, 'test', SEVEN_DAYS);

        const session = await Session.validateRefreshToken(refreshToken, userId);
        expect(session).not.toBeNull();
        expect(session.userId.toString()).toBe(userId.toString());
    });

    it('should not validate an invalid refresh token', async () => {
        const userId = new mongoose.Types.ObjectId();
        const refreshToken = signToken({ id: userId }, '7d');
        await Session.createSession(userId, refreshToken, 'test', 604800);

        const invalidToken = 'totally-invalid-token'; // not a valid JWT, so definitely won’t match
        const session = await Session.validateRefreshToken(invalidToken, userId);
        expect(session).toBeNull();
    });


    it('should rotate refresh token and invalidate old one', async () => {
        const userId = new mongoose.Types.ObjectId();
        const oldRefresh = signToken({ id: userId }, '7d');
        const session = await Session.createSession(userId, oldRefresh, 'test', SEVEN_DAYS);

        const newRefresh = signToken({ id: userId }, '7d');
        await session.rotateRefreshToken(newRefresh);

        // Old invalid
        // Old invalid
        let validated = await Session.validateRefreshToken(oldRefresh, userId);
        expect(validated).toBeNull(); // will now pass because old hash no longer matches
        validated = await Session.validateRefreshToken(newRefresh, userId);
        expect(validated).not.toBeNull(); 
    });

    it('should not validate an expired refresh token', async () => {
        const userId = new mongoose.Types.ObjectId();
        const refreshToken = signToken({ id: userId }, '1s'); // short expiry
        await Session.createSession(userId, refreshToken, 'test', 1);

        // Wait to let token expire
        await new Promise((r) => setTimeout(r, 1500));

        const session = await Session.validateRefreshToken(refreshToken, userId);
        expect(session).toBeNull();
    });

    it('should not validate a revoked session', async () => {
        const userId = new mongoose.Types.ObjectId();
        const refreshToken = signToken({ id: userId }, '7d');
        const session = await Session.createSession(userId, refreshToken, 'test', SEVEN_DAYS);

        await session.deleteOne(); // simulate logout / revoke

        const validated = await Session.validateRefreshToken(refreshToken, userId);
        expect(validated).toBeNull();
    });
});
