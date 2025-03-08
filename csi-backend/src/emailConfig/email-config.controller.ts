import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { EmailConfigService } from './email-config.service';
import { EmailConfig } from './schemas/email-config.schema';

@Controller('email-config')
export class EmailConfigController {
    constructor(private readonly emailConfigService: EmailConfigService) {}

    // Ajouter une nouvelle configuration
    @Post()
    async createEmailConfig(@Body() emailConfig: Partial<EmailConfig>) {
        return this.emailConfigService.create(emailConfig);
    }

    // Récupérer toutes les configurations
    @Get()
    async getAllEmailConfigs() {
        return this.emailConfigService.findAll();
    }

    // Mettre à jour une configuration existante
    @Put(':id')
    async updateEmailConfig(@Param('id') id: string, @Body() emailConfig: Partial<EmailConfig>) {
        return this.emailConfigService.update(id, emailConfig);
    }

    // Supprimer une configuration
    @Delete(':id')
    async deleteEmailConfig(@Param('id') id: string) {
        return this.emailConfigService.delete(id);
    }

    @Post('/reset')
    async resetEmailConfig(@Body() emailConfig: Partial<EmailConfig>) {
        return this.emailConfigService.resetAndCreate(emailConfig);
    }
}