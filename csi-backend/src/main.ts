import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';
import { config } from './config';
import * as mongoose from 'mongoose';
import * as express from 'express';
import { join } from 'path';
import * as bodyParser from 'body-parser';
import * as fs from 'fs';

async function bootstrap() {
  console.log('🚀 BACKEND VERSION v2.1 (RAW BUFFER + UTF-16) STARTING...');
  const app = await NestFactory.create(AppModule);

  // 🔧 Augmenter les limites de taille des requêtes (utile pour gros CSV ou PDF)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.use(express.raw({ limit: '50mb' }));

  // ✅ Connexion à MongoDB
  console.log('🔍 MongoDB URI:', config.MONGODB_URI);
  if (!config.MONGODB_URI) {
    throw new Error(
      'MongoDB URI is not defined. Check your environment variables.',
    );
  }

  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1); // Stop l'application si la connexion échoue
  }

  // ✅ Middleware de validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les champs inconnus
      forbidNonWhitelisted: false, // Ignorer les champs inconnus (au lieu de rejeter)
      transform: true, // Transforme les données en objets DTO
      enableDebugMessages: true, // Active les messages détaillés
    }),
  );

  // ✅ Activer CORS
  const allowedOrigins = [
    config.FRONTEND_URL,
    'http://localhost:3001',
    'https://csi-app-tony.vercel.app',
    'https://csi-app-tony.vercel.app/', // au cas où
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o))) {
        return callback(null, true);
      } else {
        console.log('❌ CORS Blocked Origin:', origin);
        return callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // ✅ Servir le dossier `uploads` en tant que fichiers statiques accessibles via URL
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // ✅ Préfixe global des routes API
  app.setGlobalPrefix('api');

  const filePath = join(
    __dirname,
    '..',
    'uploads',
    'doctorants/CCA8C3D4-167C-5646-9ECE-0130AAD64A5C/rapport/Rapport_ADIMI_Yasmine_67eb205d7a3f7b7c867dbcd0.pdf',
  );

  console.log('🧐 Vérification du fichier :', filePath);

  if (fs.existsSync(filePath)) {
    console.log('✅ Fichier trouvé !');
  } else {
    console.error('❌ Fichier non trouvé !');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
}
bootstrap();
