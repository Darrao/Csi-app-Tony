import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token } from './schemas/token.schema';
import { Doctorant } from '../doctorant/schemas/doctorant.schema'; // Importer le modèle Doctorant
import { DoctorantService } from '../doctorant/doctorant.service';

@Injectable()
export class TokenService {
    constructor(
        @InjectModel(Token.name) private tokenModel: Model<Token>,
        @InjectModel(Doctorant.name) private doctorantModel: Model<Doctorant>, // Injection du modèle Doctorant
        @Inject(forwardRef(() => DoctorantService)) private doctorantService: DoctorantService,
    ) {}

    async saveToken(token: string, email: string, type: string, doctorantEmail?: string) {
        const tokenData = {
            token,
            email,
            type,
            role: type,
            doctorantEmail, // Ajout du lien vers le doctorant
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            createdAt: new Date(),
        };
    
        console.log('Données sauvegardées dans la base pour le token :', tokenData);
        await this.tokenModel.create(tokenData);
    }

    async getTokenData(token: string): Promise<Token | null> {
        return this.tokenModel.findOne({ token }).exec();
    }

    async validateToken(token: string) {
        console.log('Validation du token :', token);
        const tokenData = await this.getTokenData(token);
        console.log('Données trouvées pour le token :', tokenData);
    
        if (!tokenData || tokenData.expiresAt < new Date()) {
            console.log('Token invalide ou expiré');
            return { valid: false };
        }
    
        const doctorant = tokenData.doctorantEmail
            ? await this.doctorantModel.findOne({ email: tokenData.doctorantEmail }).exec()
            : null;
    
        console.log('Doctorant associé au token :', doctorant);
    
        return {
            valid: true,
            email: tokenData.email,
            type: tokenData.type,
            doctorant: doctorant || null,
            doctorantEmail: tokenData.doctorantEmail || null,
        };
    }
}