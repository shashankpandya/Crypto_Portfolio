'use strict';

const request = require('supertest');
const app = require('../app');

describe('Health Endpoints (P3-10)', () => {
  it('GET /health returns dependency state (503 when DB not connected in test)', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('degraded');
    expect(res.body.db).toBe('disconnected');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.dependencies).toBeDefined();
    expect(res.body.dependencies.blockchain).toBeDefined();
  });

  it('GET /health/live returns 200 ok', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeDefined();
  });

  it('GET /health/ready reports ready state', async () => {
    const res = await request(app).get('/health/ready');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('ready');
  });
});
