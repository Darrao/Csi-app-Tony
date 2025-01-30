import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Token extends Document {
    @Prop({ required: true })
    token: string;

    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    type: string; // Exemple: 'doctorant', 'representant'

    @Prop({ required: true })
    role: string; // Champ obligatoire causant l'erreur

    @Prop({ required: true })
    expiresAt: Date; // Date d'expiration du token

    @Prop({ default: null }) // Ajout de la propriété doctorantEmail
    doctorantEmail?: string;
}

export const TokenSchema = SchemaFactory.createForClass(Token);