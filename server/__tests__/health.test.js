const { getApp, closePool, request } = require('./helpers');

describe('Health and root endpoints', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closePool();
  });

  test('GET / — returns API banner', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/StudentConnect/i);
  });

  test('GET /healthz — returns ok and uptime', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});
