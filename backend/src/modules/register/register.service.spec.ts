import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RegisterService } from './register.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';

describe('RegisterService', () => {
  let service: RegisterService;
  let tenantsService: { create: jest.Mock; findAll: jest.Mock };
  let usersService: { create: jest.Mock };

  const fakeTenant = {
    id: 'ten-1',
    name: 'Empresa A',
    slug: 'empresa-a',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const fakeAdmin = {
    id: 'u-1',
    tenantId: 'ten-1',
    email: 'admin@empresa.com',
    name: 'Admin',
    role: 'tenant_admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    tenantsService = {
      create: jest.fn().mockResolvedValue(fakeTenant),
      findAll: jest.fn().mockResolvedValue([]),
    };
    usersService = { create: jest.fn().mockResolvedValue(fakeAdmin) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterService,
        { provide: TenantsService, useValue: tenantsService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get<RegisterService>(RegisterService);
  });

  it('creates tenant and tenant_admin and returns both', async () => {
    const result = await service.register({
      companyName: 'Empresa A',
      slug: 'empresa-a',
      adminEmail: 'admin@empresa.com',
      adminPassword: 'senha123',
      adminName: 'Admin',
    });

    expect(tenantsService.create).toHaveBeenCalledWith({
      name: 'Empresa A',
      slug: 'empresa-a',
    });
    expect(usersService.create).toHaveBeenCalledWith({
      tenantId: 'ten-1',
      email: 'admin@empresa.com',
      password: 'senha123',
      name: 'Admin',
      role: 'tenant_admin',
    });
    expect(result.tenant).toEqual(fakeTenant);
    expect(result.user).toEqual(fakeAdmin);
  });

  it('throws ConflictException when slug already exists', async () => {
    tenantsService.findAll.mockResolvedValue([fakeTenant]);

    await expect(
      service.register({
        companyName: 'Empresa A',
        slug: 'empresa-a',
        adminEmail: 'outro@empresa.com',
        adminPassword: 'senha123',
        adminName: 'Outro',
      }),
    ).rejects.toThrow(ConflictException);

    expect(tenantsService.create).not.toHaveBeenCalled();
  });
});
