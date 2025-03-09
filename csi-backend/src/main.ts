import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';
import { config } from './config';
import * as mongoose from 'mongoose';


async function bootstrap() {
    const app = await NestFactory.create(AppModule);
        // Connexion à MongoDB
        console.log('🔍 MongoDB URI:', config.MONGODB_URI);
        if (!config.MONGODB_URI) {
            throw new Error('MongoDB URI is not defined. Check your environment variables.');
        }
    
        try {
            await mongoose.connect(config.MONGODB_URI);
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            console.error('❌ MongoDB Connection Error:', error);
            process.exit(1); // Stop l'application si la connexion échoue
        }
    
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

    await app.listen(3000, '0.0.0.0');
}
bootstrap();