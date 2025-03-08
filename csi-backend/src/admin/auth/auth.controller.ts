import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() { email, password }: { email: string; password: string }) {
    const token = await this.authService.login(email, password);
    if (!token) throw new UnauthorizedException('❌ Email ou mot de passe incorrect');
    return { access_token: token };
  }
}