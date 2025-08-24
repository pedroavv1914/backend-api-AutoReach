import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// Extend Request interface to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: any;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract subdomain from hostname
      const hostname = req.hostname || req.get('host') || '';
      const subdomain = hostname.split('.')[0];

      // Skip tenant resolution for main domain or localhost
      if (subdomain === 'api' || subdomain === 'localhost' || hostname.includes('localhost')) {
        // For development/testing, use a default tenant or skip
        req.tenantId = 'default-tenant';
        return next();
      }

      // Find tenant by subdomain
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain },
        select: {
          id: true,
          name: true,
          subdomain: true,
          isActive: true,
          settings: true,
        },
      });

      if (!tenant) {
        throw new BadRequestException(`Tenant not found for subdomain: ${subdomain}`);
      }

      if (!tenant.isActive) {
        throw new BadRequestException(`Tenant is inactive: ${subdomain}`);
      }

      // Attach tenant info to request
      req.tenantId = tenant.id;
      req.tenant = tenant;

      next();
    } catch (error: unknown) {
      throw new BadRequestException(`Invalid tenant: ${(error as Error).message}`);
    }
  }
}
