import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class FichierExterne {
    @Prop({ required: true }) 
    nomOriginal: string;

    @Prop({ required: true }) 
    cheminStockage: string;
}

@Schema()
export class Doctorant extends Document {
    @Prop({ required: false, default: '' })
    prenom?: string;

    @Prop({ required: false, default: '' })
    nom?: string;

    @Prop({ required: false, unique: true, default: '' })
    email?: string;
    
    @Prop({ required: false, default: '' })
    ID_DOCTORANT?: string;

    @Prop({ required: false, default: '' })
    departementDoctorant?: string;

    @Prop({ required: false, default: null })
    datePremiereInscription?: Date;

    @Prop({ required: false, default: '' })
    anneeThese?: string;

    @Prop({ required: false, default: '' })
    typeFinancement?: string;

    @Prop({ required: false, default: '' })
    missions?: string;

    @Prop({ required: false, default: '' })
    titreThese?: string;

    @Prop({ required: false, default: '' })
    intituleUR?: string;

    @Prop({ required: false, default: '' })
    directeurUR?: string;

    @Prop({ required: false, default: '' })
    intituleEquipe?: string;

    @Prop({ required: false, default: '' })
    directeurEquipe?: string;

    // directeur de these
    @Prop({ required: false, default: '' })
    nomPrenomHDR?: string;

    @Prop({ required: false, default: '' })
    email_HDR?: string;

    @Prop({ required: false, default: '' })
    coDirecteurThese?: string;

    @Prop({ required: false, default: '' })
    prenomMembre1?: string;

    @Prop({ required: false, default: '' })
    nomMembre1?: string;

    @Prop({ required: false, default: '' })
    emailMembre1?: string;

    @Prop({ required: false, default: '' })
    univesityMembre1?: string;

    @Prop({ required: false, default: '' })
    prenomMembre2?: string;

    @Prop({ required: false, default: '' })
    nomMembre2?: string;

    @Prop({ required: false, default: '' })
    emailMembre2?: string;

    @Prop({ required: false, default: '' })
    univesityMembre2?: string;

    @Prop({ required: false, default: '' })
    prenomAdditionalMembre?: string;

    @Prop({ required: false, default: '' })
    nomAdditionalMembre?: string;

    @Prop({ required: false, default: '' })
    emailAdditionalMembre?: string;

    @Prop({ required: false, default: '' })
    universityAdditionalMembre?: string;

    @Prop({ required: false, default: '' })
    report?: string;

    @Prop({ required: false, default: 0 })
    nbHoursScientificModules?: number;

    @Prop({ required: false, default: 0 })
    nbHoursCrossDisciplinaryModules?: number;

    @Prop({ required: false, default: 0 })
    nbHoursProfessionalIntegrationModules?: number;

    @Prop({ required: false, default: 0 })
    totalNbHours?: number;

    // @Prop({ required: false, default: '' })
    // listScientificModules?: string;

    // @Prop({ required: false, default: '' })
    // listCrossDisciplinaryModules?: string;

    // @Prop({ required: false, default: '' })
    // listProfessionalIntegrationModules?: string;

    @Prop({ required: false, default: '' })
    posters?: string;

    @Prop({ required: false, default: '' })
    conferencePapers?: string;

    @Prop({ required: false, default: '' })
    publications?: string;

    @Prop({ required: false, default: '' })
    publicCommunication?: string;

    @Prop({ required: false, default: null })
    dateValidation?: Date;

    @Prop({ required: false, default: '' })
    additionalInformation?: string;

    // Champs pour les questions Q1 à Q17 avec feedback et commentaires
    @Prop({ required: false, default: '' }) Q1?: string;
    @Prop({ required: false, default: '' }) Q1_comment?: string;

    @Prop({ required: false, default: '' }) Q2?: string;
    @Prop({ required: false, default: '' }) Q2_comment?: string;

    @Prop({ required: false, default: '' }) Q3?: string;
    @Prop({ required: false, default: '' }) Q3_comment?: string;

    @Prop({ required: false, default: '' }) Q4?: string;
    @Prop({ required: false, default: '' }) Q4_comment?: string;

    @Prop({ required: false, default: '' }) Q5?: string;
    @Prop({ required: false, default: '' }) Q5_comment?: string;

    @Prop({ required: false, default: '' }) Q6?: string;
    @Prop({ required: false, default: '' }) Q6_comment?: string;

    @Prop({ required: false, default: '' }) Q7?: string;
    @Prop({ required: false, default: '' }) Q7_comment?: string;

    @Prop({ required: false, default: '' }) Q8?: string;
    @Prop({ required: false, default: '' }) Q8_comment?: string;

    @Prop({ required: false, default: '' }) Q9?: string;
    @Prop({ required: false, default: '' }) Q9_comment?: string;

    @Prop({ required: false, default: '' }) Q10?: string;
    @Prop({ required: false, default: '' }) Q10_comment?: string;

    @Prop({ required: false, default: '' }) Q11?: string;
    @Prop({ required: false, default: '' }) Q11_comment?: string;

    @Prop({ required: false, default: '' }) Q12?: string;
    @Prop({ required: false, default: '' }) Q12_comment?: string;

    @Prop({ required: false, default: '' }) Q13?: string;
    @Prop({ required: false, default: '' }) Q13_comment?: string;

    @Prop({ required: false, default: '' }) Q14?: string;
    @Prop({ required: false, default: '' }) Q14_comment?: string;

    @Prop({ required: false, default: '' }) Q15?: string;
    @Prop({ required: false, default: '' }) Q15_comment?: string;

    @Prop({ required: false, default: '' }) Q16?: string;
    @Prop({ required: false, default: '' }) Q16_comment?: string;

    @Prop({ required: false, default: '' }) Q17?: string;
    @Prop({ required: false, default: '' }) Q17_comment?: string;

    // Champ conclusion
    @Prop({ required: false, default: '' })
    conclusion?: string;

    // Remplacement de R1-R5 par un champ unique pour la recommandation et le commentaire associé
    @Prop({ required: false, default: '' })
    recommendation?: string;

    @Prop({ required: false, default: '' })
    recommendation_comment?: string;

    @Prop({ type: [FichierExterne], default: [] }) 
    fichiersExternes: FichierExterne[];

    
    @Prop({ required: false, default: false })
    sendToDoctorant?: boolean;

    @Prop({ required: false, default: 0 })
    NbSendToDoctorant?: number;

    @Prop({ required: false, default: false })
    doctorantValide?: boolean;

    @Prop({ required: false, default: false })
    sendToRepresentants?: boolean;

    @Prop({ required: false, default: 0 })
    NbSendToRepresentants?: number;

    @Prop({ required: false, default: false })
    representantValide?: boolean;
}

export const DoctorantSchema = SchemaFactory.createForClass(Doctorant);