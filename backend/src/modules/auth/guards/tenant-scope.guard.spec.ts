import { ForbiddenException } from '@nestjs/common';
import { TenantScopeGuard } from './tenant-scope.guard';

function buildContext(userTenantId: string | null, requestTenantId?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { tenantId: userTenantId, role: userTenantId ? 'tenant_admin' : 'super_admin' },
        params: requestTenantId ? { tenantId: requestTenantId } : {},
        query: {},
        body: {},
      }),
    }),
  } as any;
}

describe('TenantScopeGuard', () => {
  let guard: TenantScopeGuard;

  beforeEach(() => {
    guard = new TenantScopeGuard();
  });

  it('passes when super_admin (tenantId null) accesses any tenant', () => {
    expect(guard.canActivate(buildContext(null, 'ten-outro'))).toBe(true);
  });

  it('passes when tenantId in params matches user tenantId', () => {
    expect(guard.canActivate(buildContext('ten-1', 'ten-1'))).toBe(true);
  });

  it('throws ForbiddenException when tenantId in params differs from user tenantId', () => {
    expect(() => guard.canActivate(buildContext('ten-1', 'ten-2'))).toThrow(
      ForbiddenException,
    );
  });

  it('passes when no tenantId present in request (rota sem escopo de tenant)', () => {
    expect(guard.canActivate(buildContext('ten-1', undefined))).toBe(true);
  });

  it('throws ForbiddenException when tenantId in body differs from user tenantId', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { tenantId: 'ten-1', role: 'operator' },
          params: {},
          query: {},
          body: { tenantId: 'ten-2' },
        }),
      }),
    } as any;

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
