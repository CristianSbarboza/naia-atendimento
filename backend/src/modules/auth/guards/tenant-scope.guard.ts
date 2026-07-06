import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

interface RequestWithUser {
  user: { tenantId: string | null; role: string };
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, string>;
}

@Injectable()
export class TenantScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params, query, body } = req;

    if (user.tenantId === null) return true;

    const requestedTenantId = params.tenantId ?? query.tenantId ?? body.tenantId;

    if (!requestedTenantId) return true;

    if (requestedTenantId !== user.tenantId) {
      throw new ForbiddenException('Acesso negado: tenant inválido');
    }

    return true;
  }
}
