import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';
import { config } from './config';
import * as mongoose from 'mongoose';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ✅ Connexion à MongoDB
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

    // ✅ Middleware de validation
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,  // Supprime les champs inconnus
        forbidNonWhitelisted: true, // Rejette toute clé non déclarée
        transform: true,  // Transforme les données en objets DTO
        enableDebugMessages: true, // Active les messages détaillés
    }));

    // ✅ Activer CORS
    app.enableCors({
        origin: `${config.FRONTEND_URL}`, // Frontend URL
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    // ✅ Servir le dossier `uploads` en tant que fichiers statiques accessibles via URL
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

    // ✅ Préfixe global des routes API
    app.setGlobalPrefix('api');

    const filePath = join(__dirname, '..', 'uploads', 'doctorants/CCA8C3D4-167C-5646-9ECE-0130AAD64A5C/rapport/Rapport_ADIMI_Yasmine_67d086604443fc79c0c3afe6.pdf');

    console.log("🧐 Vérification du fichier :", filePath);

    if (fs.existsSync(filePath)) {
        console.log("✅ Fichier trouvé !");
    } else {
        console.error("❌ Fichier non trouvé !");
    }

    await app.listen(3000, '0.0.0.0');
    console.log(`🚀 Serveur démarré sur http://localhost:3000`);
}
bootstrap();