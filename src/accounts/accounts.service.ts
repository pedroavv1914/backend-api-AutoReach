import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUserByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async list(email: string) {
    const user = await this.getUserByEmail(email);
    return this.prisma.account.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        externalId: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async connect(
    email: string,
    body: { provider: string; accessToken: string; refreshToken?: string; expiresAt?: string; externalId?: string },
  ) {
    const user = await this.getUserByEmail(email);
    return this.prisma.account.create({
      data: {
        userId: user.id,
        provider: body.provider,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        externalId: body.externalId ?? null,
      },
      select: { id: true },
    });
  }

  async remove(email: string, id: string) {
    const user = await this.getUserByEmail(email);
    // ensure belongs to user
    const acc = await this.prisma.account.findFirst({ where: { id, userId: user.id } });
    if (!acc) throw new NotFoundException('Conta não encontrada');
    await this.prisma.account.delete({ where: { id } });
    return { deleted: true };
  }
}
