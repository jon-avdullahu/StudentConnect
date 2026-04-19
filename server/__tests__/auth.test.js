const { getApp, registerUser, uniqueEmail, closePool, request } = require('./helpers');

describe('Authentication API', () => {
  let app;

  beforeAll(async () => {
    app = await getApp();
  });

  afterAll(async () => {
    await closePool();
  });

  test('POST /api/auth/register — rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@y.z' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('POST /api/auth/register — rejects invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'Password123!',
      fullName: 'Bob',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  test('POST /api/auth/register — rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: uniqueEmail('short'),
      password: '123',
      fullName: 'Bob',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });

  test('POST /api/auth/register — succeeds and returns JWT for valid input', async () => {
    const { res, body } = await registerUser(app);
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      email: body.email.toLowerCase(),
      full_name: 'Test User',
      role: 'student',
    });
  });

  test('POST /api/auth/register — returns 409 on duplicate email', async () => {
    const { body: first } = await registerUser(app);
    const dup = await request(app).post('/api/auth/register').send({
      email: first.email,
      password: 'Password123!',
      fullName: 'Other Person',
    });
    expect(dup.status).toBe(409);
  });

  test('POST /api/auth/login — succeeds with correct credentials', async () => {
    const { body } = await registerUser(app);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: body.password });
    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
    expect(login.body.user.email).toBe(body.email.toLowerCase());
  });

  test('POST /api/auth/login — returns identical 401 for unknown email and wrong password (anti-enumeration)', async () => {
    const { body } = await registerUser(app);
    const wrongPwd = await request(app)
      .post('/api/auth/login')
      .send({ email: body.email, password: 'WrongPassword!' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail('ghost'), password: 'AnyPassword!' });

    expect(wrongPwd.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPwd.body.error).toBe(unknownEmail.body.error);
  });

  test('GET /api/me — rejects missing token with 401', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/me — rejects malformed JWT with 401', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer this.is.not.a.real.jwt');
    expect(res.status).toBe(401);
  });

  test('GET /api/me — returns the authenticated user profile', async () => {
    const { res, body } = await registerUser(app, { fullName: 'Alice Auth' });
    const me = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      email: body.email.toLowerCase(),
      full_name: 'Alice Auth',
      role: 'student',
    });
  });
});
