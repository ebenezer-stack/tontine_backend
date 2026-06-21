import request from 'supertest';
import { app, prisma } from '../index';

describe('Auth Endpoints', () => {
  it('should return 400 if phone is missing on register', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User'
    });
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should return 404 if logging in with unknown phone', async () => {
    const res = await request(app).post('/api/auth/login').send({
      phone: '00000000'
    });
    
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should verify OTP successfully', async () => {
    // Clean up first
    await prisma.users.deleteMany({ where: { phone: '00112233' } });
    await prisma.otps.deleteMany({ where: { phone: '00112233' } });

    // 1. Register a user
    const res1 = await request(app).post('/api/auth/register').send({
      phone: '00112233',
      name: 'Test OTP User'
    });
    expect(res1.statusCode).toEqual(200);

    // 2. Verify OTP
    const res2 = await request(app).post('/api/auth/verify-otp').send({
      phone: '00112233',
      otp_code: '123456'
    });

    console.log('Verify response:', res2.body);
    expect(res2.statusCode).toEqual(200);
    expect(res2.body.success).toBe(true);
  });
});

describe('App Basics', () => {
  it('should hit basic route', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'TontineApp Node.js Backend is running!');
  });
});
