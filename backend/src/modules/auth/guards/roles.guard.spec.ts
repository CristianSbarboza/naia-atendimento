import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

const mockReflector = { getAllAndOverride: jest.fn() };

function buildContext(role: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { role } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(mockReflector as any);
  });

  it('passes when no @Roles() decorator is set', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext('operator'))).toBe(true);
  });

  it('passes when user role matches required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['tenant_admin']);

    expect(guard.canActivate(buildContext('tenant_admin'))).toBe(true);
  });

  it('throws ForbiddenException when user role does not match', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['tenant_admin']);

    expect(() => guard.canActivate(buildContext('operator'))).toThrow(
      ForbiddenException,
    );
  });

  it('passes when user is super_admin regardless of required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['tenant_admin']);

    expect(guard.canActivate(buildContext('super_admin'))).toBe(true);
  });
});
