import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { validateUser: jest.Mock; login: jest.Mock };

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn().mockReturnValue({ accessToken: 'fake-token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns accessToken when credentials are valid', async () => {
    const fakeUser = { id: 'u-1', email: 'joao@empresa.com', role: 'operator' };
    authService.validateUser.mockResolvedValue(fakeUser);

    const result = await controller.login({ email: 'joao@empresa.com', password: 'senha' });

    expect(result).toEqual({ accessToken: 'fake-token' });
    expect(authService.login).toHaveBeenCalledWith(fakeUser);
  });

  it('throws UnauthorizedException when credentials are invalid', async () => {
    authService.validateUser.mockResolvedValue(null);

    await expect(
      controller.login({ email: 'wrong@empresa.com', password: 'errada' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
