import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function buildContext() {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('returns true immediately for routes marked @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(buildContext());

    expect(result).toBe(true);
  });

  it('calls passport super.canActivate when route is not @Public()', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const superSpy = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);

    guard.canActivate(buildContext());

    expect(superSpy).toHaveBeenCalled();
    superSpy.mockRestore();
  });
});
