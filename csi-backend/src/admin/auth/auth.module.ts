import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminModule } from '../admin.module'; // Import du module Admin

@Module({
  imports: [
    AdminModule, // Assure-toi qu'il est bien importé
    JwtModule.register({
      secret: process.env.SECRET_KEY, // Assure-toi que SECRET_KEY est bien défini dans .env
      signOptions: { expiresIn: '100y' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule], // Exporte JwtModule pour qu'il soit utilisable
})
export class AuthModule {}