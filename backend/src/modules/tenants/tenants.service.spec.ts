import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { DB } from '../../database/database.module';

const mockReturning = jest.fn();

const mockSelectChain = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn(),
};

const mockInsertChain = {
  values: jest.fn().mockReturnThis(),
  returning: mockReturning,
};

const mockUpdateChain = {
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  returning: mockReturning,
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockSelectChain),
  insert: jest.fn().mockReturnValue(mockInsertChain),
  update: jest.fn().mockReturnValue(mockUpdateChain),
};

const fakeTenant = {
  id: 'ten-1',
  name: 'Empresa A',
  slug: 'empresa-a',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSelectChain.from.mockReturnThis();
    mockSelectChain.where.mockReturnThis();
    mockInsertChain.values.mockReturnThis();
    mockUpdateChain.set.mockReturnThis();
    mockUpdateChain.where.mockReturnThis();
    mockDb.select.mockReturnValue(mockSelectChain);
    mockDb.insert.mockReturnValue(mockInsertChain);
    mockDb.update.mockReturnValue(mockUpdateChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantsService, { provide: DB, useValue: mockDb }],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('create', () => {
    it('inserts a tenant and returns it', async () => {
      mockReturning.mockResolvedValue([fakeTenant]);

      const result = await service.create({ name: 'Empresa A', slug: 'empresa-a' });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toEqual(fakeTenant);
    });
  });

  describe('findAll', () => {
    it('returns all tenants', async () => {
      mockSelectChain.from.mockReturnValue([fakeTenant]);

      const result = await service.findAll();

      expect(result).toEqual([fakeTenant]);
    });
  });

  describe('findById', () => {
    it('returns the tenant when found', async () => {
      mockSelectChain.limit.mockResolvedValue([fakeTenant]);

      const result = await service.findById('ten-1');

      expect(result).toEqual(fakeTenant);
    });

    it('returns null when not found', async () => {
      mockSelectChain.limit.mockResolvedValue([]);

      const result = await service.findById('inexistente');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates a tenant and returns the updated record', async () => {
      const updated = { ...fakeTenant, name: 'Empresa B' };
      mockReturning.mockResolvedValue([updated]);

      const result = await service.update('ten-1', { name: 'Empresa B' });

      expect(mockDb.update).toHaveBeenCalled();
      expect(result?.name).toBe('Empresa B');
    });

    it('returns null when tenant does not exist', async () => {
      mockReturning.mockResolvedValue([]);

      const result = await service.update('inexistente', { name: 'X' });

      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('sets status to inactive', async () => {
      const deactivated = { ...fakeTenant, status: 'inactive' };
      mockReturning.mockResolvedValue([deactivated]);

      const result = await service.deactivate('ten-1');

      expect(result?.status).toBe('inactive');
    });
  });
});
