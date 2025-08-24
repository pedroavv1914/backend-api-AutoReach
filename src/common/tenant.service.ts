import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async createTenant(data: {
    name: string;
    subdomain: string;
    domain?: string;
    settings?: any;
    plan?: string;
  }) {
    return (this.prisma as any).tenant.create({
      data: {
        name: data.name,
        subdomain: data.subdomain,
        domain: data.domain,
        settings: data.settings,
        planType: data.plan || 'starter',
        updatedAt: new Date(),
      },
    });
  }

  async getTenantBySubdomain(subdomain: string) {
    return (this.prisma as any).tenant.findUnique({
      where: { subdomain },
    });
  }

  async getTenantById(id: string) {
    return (this.prisma as any).tenant.findUnique({
      where: { id },
    });
  }

  async updateTenant(id: string, data: {
    name?: string;
    domain?: string;
    settings?: any;
  }) {
    return (this.prisma as any).tenant.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async deleteTenant(id: string) {
    return (this.prisma as any).tenant.delete({
      where: { id },
    });
  }

  async listTenants() {
    return (this.prisma as any).tenant.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
        domain: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            posts: true,
          },
        },
      },
    });
  }
}
