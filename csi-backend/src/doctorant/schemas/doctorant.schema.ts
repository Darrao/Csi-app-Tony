import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Doctorant extends Document {
    @Prop({ required: true })
    nom: string;

    @Prop({ required: true })
    prenom: string;

    @Prop({ required: true })
    dateInscription: Date;

    @Prop({ required: true })
    titreThese: string;

    @Prop({ required: true })
    uniteRecherche: string;

    @Prop({ required: true })
    directeurThese: string;

    @Prop({ required: true })
    financement: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ type: Object, default: null })
    representantData: {
        champPlus1: string;
        champPlus2: string;
    };
}

export const DoctorantSchema = SchemaFactory.createForClass(Doctorant);