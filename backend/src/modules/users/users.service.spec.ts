import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { DB } from '../../database/database.module';

const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockInsert = {
  values: jest.fn().mockReturnThis(),
};

const mockUpdateChain = {
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: jest.fn(),
};

const mockDeleteChain = {
  where: jest.fn().mockResolvedValue(undefined),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockReturnValue(mockInsert),
  update: jest.fn().mockReturnValue(mockUpdateChain),
  delete: jest.fn().mockReturnValue(mockDeleteChain),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
    mockUpdateChain.set.mockReturnThis();
    mockUpdateChain.where.mockReturnThis();
    mockDeleteChain.where.mockResolvedValue(undefined);
    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.insert.mockReturnValue(mockInsert);
    mockDb.update.mockReturnValue(mockUpdateChain);
    mockDb.delete.mockReturnValue(mockDeleteChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DB, useValue: mockDb }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByEmail', () => {
    it('returns the user (with passwordHash) when found', async () => {
      const fakeUser = {
        id: 'u-1',
        email: 'joao@empresa.com',
        passwordHash: 'hash',
      };
      mockSelectChain.limit.mockResolvedValue([fakeUser]);

      const result = await service.findByEmail('joao@empresa.com');

      expect(result).toEqual(fakeUser);
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);
      const result = await service.findByEmail('missing@empresa.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the user without passwordHash', async () => {
      const fakeUser = {
        id: 'u-1',
        email: 'joao@empresa.com',
        name: 'João',
        role: 'operator',
      };
      mockSelectChain.limit.mockResolvedValue([fakeUser]);

      const result = await service.findById('u-1');

      expect(result).toEqual(fakeUser);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);
      const result = await service.findById('missing-id');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('hashes the password and returns the created user without passwordHash', async () => {
      mockInsert.values.mockResolvedValue(undefined);
      const createdRow = {
        id: 'generated-id',
        tenantId: 'ten-1',
        email: 'ana@empresa.com',
        name: 'Ana',
        role: 'operator',
      };
      mockSelectChain.limit.mockResolvedValue([createdRow]);

      const result = await service.create({
        tenantId: 'ten-1',
        email: 'ana@empresa.com',
        password: 'senha-super-secreta',
        name: 'Ana',
        role: 'operator',
      });

      const insertedValues = mockInsert.values.mock.calls[0][0];
      expect(insertedValues.email).toBe('ana@empresa.com');
      expect(insertedValues.passwordHash).not.toBe('senha-super-secreta');
      expect(
        await bcrypt.compare(
          'senha-super-secreta',
          insertedValues.passwordHash,
        ),
      ).toBe(true);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('ana@empresa.com');
    });
  });

  describe('findAllByTenant', () => {
    it('returns all users for the tenant', async () => {
      const fakeUsers = [
        { id: 'u-1', tenantId: 'ten-1', email: 'a@a.com', name: 'A', role: 'operator' },
        { id: 'u-2', tenantId: 'ten-1', email: 'b@b.com', name: 'B', role: 'tenant_admin' },
      ];
      mockSelectChain.where.mockResolvedValue(fakeUsers);

      const result = await service.findAllByTenant('ten-1');

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('ten-1');
    });
  });

  describe('update', () => {
    it('updates name and role and returns updated user', async () => {
      const updated = { id: 'u-1', tenantId: 'ten-1', email: 'a@a.com', name: 'Novo Nome', role: 'tenant_admin' };
      mockUpdateChain.returning.mockResolvedValue([updated]);

      const result = await service.update('u-1', 'ten-1', { name: 'Novo Nome', role: 'tenant_admin' });

      expect(result.name).toBe('Novo Nome');
      expect(result.role).toBe('tenant_admin');
    });

    it('throws NotFoundException when user not found', async () => {
      mockUpdateChain.returning.mockResolvedValue([]);

      await expect(service.update('inexistente', 'ten-1', { name: 'X' })).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('remove', () => {
    it('deletes the user', async () => {
      mockDeleteChain.where.mockResolvedValue(undefined);

      await expect(service.remove('u-1', 'ten-1')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
