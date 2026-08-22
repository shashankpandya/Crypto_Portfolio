"use strict";
/**
 * app.test.js — Server smoke and security tests (P1-15)
 */

const request = require("supertest");
const app = require("../src/app");

describe("GET /health", () => {
  it("responds with JSON and correct shape", async () => {
    const res = await request(app).get("/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("db");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("returns degraded when no db is connected", async () => {
    const res = await request(app).get("/health");
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

describe("Security Hardening (P1-15)", () => {
  describe("CORS Allowlist", () => {
    it("allows valid dev origin http://localhost:5173", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:5173");
      expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("rejects unauthorized origin https://evil.example.com without Access-Control-Allow-Origin header", async () => {
      const res = await request(app)
        .get("/health")
        .set("Origin", "https://evil.example.com");
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });

  describe("Express configuration", () => {
    it("has trust proxy enabled for reverse proxy deployment", () => {
      expect(app.get("trust proxy")).toBe(1);
    });
  });
});

describe("Structured Logging & Request IDs (P3-01)", () => {
  it("assigns X-Request-Id and X-Correlation-Id response headers to requests", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.headers["x-correlation-id"]).toBeDefined();
    expect(res.headers["x-request-id"]).toBe(res.headers["x-correlation-id"]);
  });

  it("propagates incoming X-Request-Id / X-Correlation-Id header", async () => {
    const customId = "custom-test-req-id-12345";
    const res = await request(app)
      .get("/health")
      .set("X-Request-Id", customId);
    expect(res.headers["x-request-id"]).toBe(customId);
    expect(res.headers["x-correlation-id"]).toBe(customId);
  });
});

