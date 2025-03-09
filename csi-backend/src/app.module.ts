import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorantModule } from './doctorant/doctorant.module';
import { EmailController } from './email/email.controller';
import { TokenModule } from './token/token.module';
import { AuthModule } from './admin/auth/auth.module';
import { EmailConfigModule } from './emailConfig/email-config.module';
import { ConfigModule } from '@nestjs/config';
import { config } from './config';

@Module({
    imports: [
        ConfigModule.forRoot(), // Charge les variables d'environnement
        MongooseModule.forRoot(config.MONGODB_URI),
        DoctorantModule,
        TokenModule,
        AuthModule,
        EmailConfigModule,
    ],
    controllers: [EmailController],
    providers: [],
})
export class AppModule {}