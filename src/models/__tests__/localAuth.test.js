// src/controllers/__tests__/localAuth.test.js
import request from "supertest";
import app from "../../index.js"; // your express app
import mongoose from "mongoose";
import {User} from "../../models/User.js";

beforeEach(async () => {
  await User.deleteMany({});
});

describe("Local Auth", () => {
  it("should sign up a new user", async () => {
    const res = await request(app)
      .post("/auth-local/signup")
      .send({ email: "test@example.com", password: "password123", name: "Tester" });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("should not allow duplicate email signup", async () => {
    await request(app)
      .post("/auth-local/signup")
      .send({ email: "test@example.com", password: "password123", name: "Tester" });

    const res = await request(app)
      .post("/auth-local/signup")
      .send({ email: "test@example.com", password: "password123", name: "Tester" });

    expect(res.statusCode).toBe(400);
  });

  it("should login with valid credentials", async () => {
    await request(app)
      .post("/auth-local/signup")
      .send({ email: "test@example.com", password: "password123", name: "Tester" });

    const res = await request(app)
      .post("/auth-local/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject login with wrong password", async () => {
    await request(app)
      .post("/auth-local/signup")
      .send({ email: "test@example.com", password: "password123", name: "Tester" });

    const res = await request(app)
      .post("/auth-local/login")
      .send({ email: "test@example.com", password: "wrongpass" });

    expect(res.statusCode).toBe(401);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
