import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Body, 
  Param, 
  HttpException, 
  HttpStatus,
  Req 
} from '@nestjs/common';
import { Request } from 'express';
import { TenantService } from '../common/tenant.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('onboard')
  async createTenant(@Body() dto: CreateTenantDto) {
    try {
      const tenant = await this.tenantService.createTenant({
        name: dto.name,
        subdomain: dto.subdomain,
        plan: dto.plan || 'starter',
      });

      return {
        success: true,
        message: 'Tenant created successfully',
        data: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          plan: tenant.plan,
          dashboardUrl: `https://${tenant.subdomain}.aithosreach.com`,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create tenant',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('current')
  async getCurrentTenant(@Req() req: Request) {
    try {
      if (!req.tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          id: req.tenant.id,
          name: req.tenant.name,
          subdomain: req.tenant.subdomain,
          plan: req.tenant.plan,
          status: req.tenant.status,
          oauthConfigured: {
            linkedin: !!(req.tenant.linkedinAppId && req.tenant.linkedinAppSecret),
            instagram: !!(req.tenant.instagramAppId && req.tenant.instagramAppSecret),
          },
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get tenant information',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('current')
  async updateCurrentTenant(@Body() dto: UpdateTenantDto, @Req() req: Request) {
    try {
      if (!req.tenantId) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      const updatedTenant = await this.tenantService.updateTenant(req.tenantId, dto);

      return {
        success: true,
        message: 'Tenant updated successfully',
        data: {
          id: updatedTenant.id,
          name: updatedTenant.name,
          subdomain: updatedTenant.subdomain,
          plan: updatedTenant.plan,
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update tenant',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('setup-status')
  async getSetupStatus(@Req() req: Request) {
    try {
      if (!req.tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      const setupSteps = {
        tenantCreated: true,
        oauthConfigured: {
          linkedin: !!(req.tenant.linkedinAppId && req.tenant.linkedinAppSecret),
          instagram: !!(req.tenant.instagramAppId && req.tenant.instagramAppSecret),
        },
        hasUsers: false, // TODO: Check if tenant has users
        hasConnectedAccounts: false, // TODO: Check if tenant has connected social accounts
      };

      const completionPercentage = this.calculateSetupCompletion(setupSteps);

      return {
        success: true,
        data: {
          steps: setupSteps,
          completionPercentage,
          nextStep: this.getNextSetupStep(setupSteps),
        },
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get setup status',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private calculateSetupCompletion(steps: any): number {
    let completed = 0;
    let total = 0;

    // Tenant created (always true if we reach this point)
    total += 1;
    completed += steps.tenantCreated ? 1 : 0;

    // OAuth configured (LinkedIn OR Instagram)
    total += 1;
    completed += (steps.oauthConfigured.linkedin || steps.oauthConfigured.instagram) ? 1 : 0;

    // Users created
    total += 1;
    completed += steps.hasUsers ? 1 : 0;

    // Connected accounts
    total += 1;
    completed += steps.hasConnectedAccounts ? 1 : 0;

    return Math.round((completed / total) * 100);
  }

  private getNextSetupStep(steps: any): string {
    if (!steps.oauthConfigured.linkedin && !steps.oauthConfigured.instagram) {
      return 'Configure OAuth apps for LinkedIn or Instagram';
    }
    if (!steps.hasUsers) {
      return 'Create your first user account';
    }
    if (!steps.hasConnectedAccounts) {
      return 'Connect your social media accounts';
    }
    return 'Setup complete! Start creating posts';
  }
}
