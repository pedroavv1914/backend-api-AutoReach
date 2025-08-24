import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string, tenantId: string) {
    return this.prisma.user.findFirst({ 
      where: { 
        email,
        tenantId
      } as any
    });
  }

  async create(data: { name?: string; email: string; passwordHash: string; tenantId: string }) {
    return this.prisma.user.create({ data: data as any });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.user.findMany({ 
      where: { tenantId } as any,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      }
    });
  }
}
