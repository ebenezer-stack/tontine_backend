import request from 'supertest';
import { app } from '../index';

describe('User Endpoints', () => {
  it('should return 401 if accessing profile without token', async () => {
    const res = await request(app).get('/api/users/profile');
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.message).toContain('Non autorisé');
  });

  it('should return 401 if token is invalid', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalid_token_here');
    
    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toContain('invalide');
  });
});
