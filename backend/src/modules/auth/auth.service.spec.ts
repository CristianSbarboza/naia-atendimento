import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('fake-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns the user without passwordHash when credentials are correct', async () => {
      const passwordHash = await bcrypt.hash('senha-correta', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u-1',
        tenantId: 'ten-1',
        email: 'joao@empresa.com',
        passwordHash,
        name: 'João',
        role: 'operator',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.validateUser('joao@empresa.com', 'senha-correta');

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.email).toBe('joao@empresa.com');
    });

    it('returns null when password is wrong', async () => {
      const passwordHash = await bcrypt.hash('senha-correta', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'u-1',
        email: 'joao@empresa.com',
        passwordHash,
        role: 'operator',
      });

      const result = await service.validateUser('joao@empresa.com', 'senha-errada');

      expect(result).toBeNull();
    });

    it('returns null when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('ninguem@empresa.com', 'qualquer');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('signs a JWT with sub, tenantId and role', () => {
      const user = {
        id: 'u-1',
        tenantId: 'ten-1',
        email: 'joao@empresa.com',
        name: 'João',
        role: 'operator',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u-1',
        tenantId: 'ten-1',
        role: 'operator',
      });
      expect(result).toEqual({ accessToken: 'fake-jwt-token' });
    });
  });
});
