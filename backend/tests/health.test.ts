import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('Health Check Endpoints', () => {
  it('GET /api/health returns 200 and healthy status payload', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.timestamp).toBe('string');
    expect(res.body).toHaveProperty('uptime');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body).toHaveProperty('environment');
  });

  it('GET /health returns 200 and matches /api/health structure', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
