import { IsNotEmpty, IsString, IsDateString, IsOptional, IsArray, IsNumber, IsEmail, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class FichierExterneDto {
    @IsNotEmpty()
    @IsString()
    nomOriginal: string;

    @IsNotEmpty()
    @IsString()
    cheminStockage: string;
}

export class CreateDoctorantDto {
    @IsNotEmpty()
    @IsString()
    prenom: string;

    @IsNotEmpty()
    @IsString()
    nom: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    ID_DOCTORANT: string;

    @IsOptional()
    @IsString()
    departementDoctorant: string;

    @IsOptional()
    @IsDateString()
    datePremiereInscription: Date;

    @IsOptional()
    @IsString()
    anneeThese: string;

    @IsOptional()
    @IsString()
    typeFinancement: string;

    @IsOptional()
    @IsString()
    typeThesis: string;

    @IsOptional()
    @IsString()
    missions?: string;

    @IsOptional()
    @IsString()
    titreThese: string;

    @IsOptional()
    @IsString()
    intituleUR: string;

    @IsOptional()
    @IsString()
    directeurUR: string;

    @IsOptional()
    @IsString()
    nomPrenomHDR: string;

    @IsOptional()
    @IsString()
    email_HDR: string;

    @IsOptional()
    @IsString()
    intituleEquipe: string;

    @IsOptional()
    @IsString()
    directeurEquipe: string;

    @IsOptional()
    @IsString()
    directeurThese: string;

    @IsOptional()
    @IsString()
    coDirecteurThese?: string;

    @IsOptional()
    @IsString()
    prenomMembre1: string;

    @IsOptional()
    @IsString()
    nomMembre1: string;

    @IsNotEmpty()
    @IsEmail()
    emailMembre1: string;

    @IsOptional()
    @IsString()
    univesityMembre1: string;

    @IsOptional()
    @IsString()
    prenomMembre2: string;

    @IsOptional()
    @IsString()
    nomMembre2: string;

    @IsOptional()
    @IsEmail()
    emailMembre2: string;

    @IsOptional()
    @IsString()
    univesityMembre2: string;

    @IsOptional()
    @IsString()
    prenomAdditionalMembre?: string;

    @IsOptional()
    @IsString()
    nomAdditionalMembre?: string;

    @IsOptional()
    @IsEmail()
    emailAdditionalMembre?: string;

    @IsOptional()
    @IsString()
    universityAdditionalMembre: string;

    @IsOptional()
    @IsString()
    report: string;

    @IsOptional()
    @IsNumber()
    nbHoursScientificModules: number;

    @IsOptional()
    @IsNumber()
    nbHoursCrossDisciplinaryModules: number;

    @IsOptional()
    @IsNumber()
    nbHoursProfessionalIntegrationModules: number;

    @IsOptional()
    @IsNumber()
    totalNbHours: number;

    // @IsOptional()
    // @IsString()
    // listScientificModules: string;

    // @IsOptional()
    // @IsString()
    // listCrossDisciplinaryModules: string;

    // @IsOptional()
    // @IsString()
    // listProfessionalIntegrationModules: string;

    @IsOptional()
    @IsString()
    posters?: string;

    @IsOptional()
    @IsString()
    conferencePapers?: string;

    @IsOptional()
    @IsString()
    publications?: string;

    @IsOptional()
    @IsString()
    publicCommunication?: string;

    @IsOptional()
    @IsDateString()
    dateValidation: Date;

    @IsOptional()
    @IsString()
    additionalInformation?: string;

    // Champs pour les questions Q1 à Q17 avec comment et commentaires
    @IsOptional() @IsString() Q1?: string;
    @IsOptional() @IsString() Q1_comment?: string;

    @IsOptional() @IsString() Q2?: string;
    @IsOptional() @IsString() Q2_comment?: string;

    @IsOptional() @IsString() Q3?: string;
    @IsOptional() @IsString() Q3_comment?: string;

    @IsOptional() @IsString() Q4?: string;
    @IsOptional() @IsString() Q4_comment?: string;

    @IsOptional() @IsString() Q5?: string;
    @IsOptional() @IsString() Q5_comment?: string;

    @IsOptional() @IsString() Q6?: string;
    @IsOptional() @IsString() Q6_comment?: string;

    @IsOptional() @IsString() Q7?: string;
    @IsOptional() @IsString() Q7_comment?: string;

    @IsOptional() @IsString() Q8?: string;
    @IsOptional() @IsString() Q8_comment?: string;

    @IsOptional() @IsString() Q9?: string;
    @IsOptional() @IsString() Q9_comment?: string;

    @IsOptional() @IsString() Q10?: string;
    @IsOptional() @IsString() Q10_comment?: string;

    @IsOptional() @IsString() Q11?: string;
    @IsOptional() @IsString() Q11_comment?: string;

    @IsOptional() @IsString() Q12?: string;
    @IsOptional() @IsString() Q12_comment?: string;

    @IsOptional() @IsString() Q13?: string;
    @IsOptional() @IsString() Q13_comment?: string;

    @IsOptional() @IsString() Q14?: string;
    @IsOptional() @IsString() Q14_comment?: string;

    @IsOptional() @IsString() Q15?: string;
    @IsOptional() @IsString() Q15_comment?: string;

    @IsOptional() @IsString() Q16?: string;
    @IsOptional() @IsString() Q16_comment?: string;

    @IsOptional() @IsString() Q17?: string;
    @IsOptional() @IsString() Q17_comment?: string;

    // Champ conclusion
    @IsOptional()
    @IsString()
    conclusion?: string;

    // Remplacement de R1-R5 par un champ unique pour la recommandation et le commentaire associé
    @IsOptional()
    @IsString()
    recommendation?: string;

    @IsOptional()
    @IsString()
    recommendation_comment?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FichierExterneDto)
    fichiersExternes?: FichierExterneDto[];

    @IsOptional()
    @IsBoolean()
    sendToDoctorant?: boolean;

    @IsOptional()
    @IsBoolean()
    doctorantValide?: boolean;

    @IsOptional()
    @IsNumber()
    NbSendToDoctorant?: number;
    
    @IsOptional()
    @IsBoolean()
    sendToRepresentants?: boolean;

    @IsOptional()
    @IsBoolean()
    representantValide?: boolean;

    @IsOptional()
    @IsNumber()
    NbSendToRepresentants?: number;
}