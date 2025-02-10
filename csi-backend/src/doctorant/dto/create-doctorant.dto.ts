import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateDoctorantDto {
    prenom: string;
    nom: string;
    email: string;
    datePremiereInscription: Date;
    csiNb: string;
    typeThesis: string;
    missions?: string;
    titreThese: string;
    intituleUR: string;
    directeurUR: string;
    intituleEquipe: string;
    directeurEquipe: string;
    directeurThese: string;
    coDirecteurThese?: string;
    membre1: string;
    emailMembre1: string;
    membre2: string;
    emailMembre2: string;
    additionalMembre?: string;
    emailAdditionalMembre?: string;
    report: string;
    nbHoursScientificModules: number;
    nbHoursCrossDisciplinaryModules: number;
    nbHoursProfessionalIntegrationModules: number;
    totalNbHours: number;
    listScientificModules: string[];
    listCrossDisciplinaryModules: string[];
    listProfessionalIntegrationModules: string[];
    posters?: string;
    conferencePapers?: string;
    publications?: string;
    publicCommunication?: string;
    dateValidation: Date;
}