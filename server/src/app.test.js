"use strict";
/**
 * app.test.js — Server smoke tests
 *
 * Rules:
 * - No live Mongo connection required (db disconnected → 503 on /health, which is correct)
 * - No outbound network calls
 * - Tests import app directly (not index.js) to avoid .listen() + DB side effects
 */

const request = require("supertest");
const app = require("../src/app");

describe("GET /health", () => {
  it("responds with JSON and correct shape", async () => {
    const res = await request(app).get("/health");
    // 503 when db not connected (no Mongo in test env) — that is correct behaviour
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("db");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("returns degraded when no db is connected", async () => {
    const res = await request(app).get("/health");
    // In test env: app.locals.dbState is not set → connected = false → 503
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
    expect(res.body.db).toBe("disconnected");
  });
});

describe("404 catch-all", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/nonexistent-route-xyz");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
  });
});
