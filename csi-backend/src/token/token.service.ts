import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Token } from './schemas/token.schema';

@Injectable()
export class TokenService {
    constructor(@InjectModel(Token.name) private tokenModel: Model<Token>) {}

    // Méthode pour enregistrer un token
    async saveToken(token: string, email: string, type: string) {
        const tokenData = {
            token,
            email,
            type,
            role: type === 'doctorant' ? 'doctorant' : 'representant',
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // Par exemple, valide 24h
            createdAt: new Date(),
        };
    
        console.log('Données sauvegardées dans la base pour le token :', tokenData);
    
        await this.tokenModel.create(tokenData);
    }

    // Méthode pour récupérer les données d'un token
    async getTokenData(token: string): Promise<Token | null> {
        // Cherche le token correspondant dans la base
        return this.tokenModel.findOne({ token }).exec();
    }

    // Méthode pour valider un token
    async validateToken(token: string): Promise<{ valid: boolean; email?: string; type?: string }> {
        const tokenData = await this.getTokenData(token); // Cherche le token dans la base
        console.log('Données récupérées pour le token :', tokenData);
    
        if (!tokenData) {
            return { valid: false };
        }
    
        // Vérifiez également si le token a expiré
        if (tokenData.expiresAt < new Date()) {
            console.log('Token expiré');
            return { valid: false };
        }
    
        return {
            valid: true,
            email: tokenData.email,
            type: tokenData.type,
        };
    }
}