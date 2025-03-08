import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import * as bcrypt from 'bcrypt';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('add')
    async addAdmin(
    @Body() { email, password }: { email: string; password: string },
    @Headers('authorization') adminToken: string
    ) {
    console.log(`🔍 Vérification du token: ${adminToken}`);

    if (adminToken !== process.env.ADMIN_SECRET_KEY) {
        console.log("❌ Tentative d'accès avec un mauvais token !");
        throw new UnauthorizedException('🚫 Accès refusé');
    }

    console.log("✅ Token validé, ajout de l'admin...");
    
    // Envoie directement le mot de passe en clair (sans hashage)
    return this.adminService.createAdmin(email, password);
    }
}