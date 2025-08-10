import { Body, Controller, Delete, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  list(@Req() req: any) {
    return this.accountsService.list(req.user.email);
  }

  // Endpoint utilitário para conectar conta manualmente (até termos OAuth real)
  @Post()
  connect(@Req() req: any, @Body() body: { provider: string; accessToken: string; refreshToken?: string; expiresAt?: string; externalId?: string }) {
    return this.accountsService.connect(req.user.email, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.accountsService.remove(req.user.email, id);
  }
}
