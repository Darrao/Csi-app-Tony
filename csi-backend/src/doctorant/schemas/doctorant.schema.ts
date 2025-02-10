import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Doctorant extends Document {
    @Prop({ required: true })
    prenom: string;

    @Prop({ required: true })
    nom: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    datePremiereInscription: Date;

    @Prop({ required: true })
    csiNb: string;

    @Prop({ required: true })
    typeThesis: string;

    @Prop({ required: false, default: '' })
    missions: string;

    @Prop({ required: true })
    titreThese: string;

    @Prop({ required: true })
    intituleUR: string;

    @Prop({ required: true })
    directeurUR: string;

    @Prop({ required: true })
    intituleEquipe: string;

    @Prop({ required: true })
    directeurEquipe: string;

    @Prop({ required: true })
    directeurThese: string;

    @Prop({ required: false, default: '' })
    coDirecteurThese: string;

    @Prop({ required: true })
    membre1: string;

    @Prop({ required: true })
    emailMembre1: string;

    @Prop({ required: true })
    membre2: string;

    @Prop({ required: true })
    emailMembre2: string;

    @Prop({ required: false, default: '' })
    additionalMembre?: string;

    @Prop({ required: false, default: '' })
    emailAdditionalMembre?: string;

    @Prop({ required: true })
    report: string;

    @Prop({ required: true })
    nbHoursScientificModules: number;

    @Prop({ required: true })
    nbHoursCrossDisciplinaryModules: number;

    @Prop({ required: true })
    nbHoursProfessionalIntegrationModules: number;

    @Prop({ required: true })
    totalNbHours: number;

    @Prop({ required: true })
    listScientificModules: string[];

    @Prop({ required: true })
    listCrossDisciplinaryModules: string[];

    @Prop({ required: true })
    listProfessionalIntegrationModules: string[];

    @Prop({ required: false, default: '' })
    posters?: string;

    @Prop({ required: false, default: '' })
    conferencePapers?: string;

    @Prop({ required: false, default: '' })
    publications?: string;

    @Prop({ required: false, default: '' })
    publicCommunication?: string;

    @Prop({ required: true })
    dateValidation: Date;

    @Prop({ type: String, default: 'en attente' }) // Valeur par défaut : en attente
    statut: string;
}

export const DoctorantSchema = SchemaFactory.createForClass(Doctorant);