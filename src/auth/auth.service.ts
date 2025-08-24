import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: { name?: string; email: string; password: string; tenantId: string }) {
    const existing = await this.usersService.findByEmail(data.email, data.tenantId);
    if (existing) {
      throw new ConflictException('Email já registrado para este tenant');
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      name: data.name,
      email: data.email,
      passwordHash,
      tenantId: data.tenantId,
    });
    const tokens = await this.issueTokens({ id: user.id, email: user.email, tenantId: (user as any).tenantId });
    return { user: { id: user.id, name: user.name, email: user.email, tenantId: (user as any).tenantId }, ...tokens };
  }

  async validateUser(email: string, password: string, tenantId: string) {
    const user = await this.usersService.findByEmail(email, tenantId);
    if (!user) return null;
    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) return null;
    return user;
  }

  async login(email: string, password: string, tenantId: string) {
    const user = await this.validateUser(email, password, tenantId);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const tokens = await this.issueTokens({ id: user.id, email: user.email, tenantId: (user as any).tenantId });
    return { user: { id: user.id, name: user.name, email: user.email, tenantId: (user as any).tenantId }, ...tokens };
  }

  private async issueTokens(payload: { id: string; email: string; tenantId: string }) {
    const accessToken = await this.jwtService.signAsync({ sub: payload.id, email: payload.email, tenantId: payload.tenantId });
    return { accessToken };
  }
}
