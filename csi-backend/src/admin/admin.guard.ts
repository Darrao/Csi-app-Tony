import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) throw new UnauthorizedException('🚫 Token manquant');

    try {
      const payload = this.jwtService.verify(token);
      if (payload.role !== 'admin') {
        throw new UnauthorizedException('🚫 Accès refusé');
      }
      return true;
    } catch (error) {
      throw new UnauthorizedException('🚫 Token invalide ou expiré');
    }
  }
}