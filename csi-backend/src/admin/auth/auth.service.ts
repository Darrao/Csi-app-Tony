import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminService } from '../admin.service';

@Injectable()
export class AuthService {
  constructor(
    private adminService: AdminService,
    private jwtService: JwtService // ✅ Injection correcte ici
  ) {}

  async login(email: string, password: string) {
    const admin = await this.adminService.validateAdmin(email, password);
    console.log(`🔍 Admin trouvé : ${admin}`);
    if (!admin) throw new Error('❌ Email ou mot de passe incorrect'); // Renvoie une erreur si invalide

    return this.jwtService.sign({ email: admin.email, role: 'admin' }); // Génère un token JWT
  }
}