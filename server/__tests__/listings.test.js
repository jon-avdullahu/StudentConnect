const { getApp, registerUser, closePool, request } = require('./helpers');

describe('Listings API', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closePool();
  });

  test('GET /api/listings — public endpoint returns an array', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/listings — accepts search and price filters without error', async () => {
    const res = await request(app)
      .get('/api/listings')
      .query({ search: 'apartment', min_price: '100', max_price: '500' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/listings/:id — invalid id returns 400', async () => {
    const res = await request(app).get('/api/listings/not-a-number');
    expect(res.status).toBe(400);
  });

  test('GET /api/listings/:id — non-existent id returns 404', async () => {
    const res = await request(app).get('/api/listings/999999999');
    expect(res.status).toBe(404);
  });

  test('POST /api/listings — rejects unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/listings')
      .field('title', 'Studio')
      .field('description', 'Nice')
      .field('price', '350');
    expect(res.status).toBe(401);
  });

  test('POST /api/listings — student role gets 403 (only landlords can create)', async () => {
    const { res } = await registerUser(app, { role: 'student' });
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${res.body.token}`)
      .field('title', 'Studio')
      .field('description', 'Nice place near campus')
      .field('price', '350');
    expect(create.status).toBe(403);
    expect(create.body.error).toMatch(/landlord/i);
  });

  test('POST /api/listings — landlord can create a listing without photos', async () => {
    const { res } = await registerUser(app, {
      role: 'landlord',
      fullName: 'Landlord Larry',
    });
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${res.body.token}`)
      .field('title', 'Bright 1BR near University')
      .field('description', 'Quiet street, 10 min walk to campus.')
      .field('price', '420');
    expect(create.status).toBe(201);
    expect(create.body).toMatchObject({
      title: 'Bright 1BR near University',
      price: expect.anything(),
    });
    expect(create.body.id).toEqual(expect.any(Number));
  });

  test('POST /api/listings — landlord submitting invalid price gets 400', async () => {
    const { res } = await registerUser(app, { role: 'landlord' });
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${res.body.token}`)
      .field('title', 'Studio')
      .field('description', 'Description here')
      .field('price', '-50');
    expect(create.status).toBe(400);
    expect(create.body.error).toMatch(/price/i);
  });

  test('PUT /api/listings/:id — non-owner cannot update another landlord listing (IDOR check)', async () => {
    const owner = await registerUser(app, { role: 'landlord' });
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${owner.res.body.token}`)
      .field('title', 'Owner Listing')
      .field('description', 'Owned by first landlord')
      .field('price', '500');
    expect(create.status).toBe(201);

    const intruder = await registerUser(app, { role: 'landlord' });
    const update = await request(app)
      .put(`/api/listings/${create.body.id}`)
      .set('Authorization', `Bearer ${intruder.res.body.token}`)
      .send({ title: 'Hijacked!' });
    expect(update.status).toBe(403);
  });

  test('DELETE /api/listings/:id — owner can delete their listing', async () => {
    const owner = await registerUser(app, { role: 'landlord' });
    const create = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${owner.res.body.token}`)
      .field('title', 'To Be Deleted')
      .field('description', 'Will be removed in test')
      .field('price', '300');
    expect(create.status).toBe(201);

    const del = await request(app)
      .delete(`/api/listings/${create.body.id}`)
      .set('Authorization', `Bearer ${owner.res.body.token}`);
    expect(del.status).toBe(200);

    const after = await request(app).get(`/api/listings/${create.body.id}`);
    expect(after.status).toBe(404);
  });
});
