import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';
import { config } from './config';


async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,  // Supprime les champs inconnus
        forbidNonWhitelisted: true, // Rejette toute clé non déclarée
        transform: true,  // Transforme les données en objets DTO
        enableDebugMessages: true, // Active les messages détaillés
    }));

    // Activer CORS
    app.enableCors({
        origin: `${config.FRONTEND_URL}`, // Frontend URL
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    await app.listen(3000);
}
bootstrap();