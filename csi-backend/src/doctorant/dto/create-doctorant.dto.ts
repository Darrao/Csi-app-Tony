import { IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateDoctorantDto {
    @IsNotEmpty()
    @IsString()
    nom: string;

    @IsNotEmpty()
    @IsString()
    prenom: string;

    @IsNotEmpty()
    @IsDateString()
    dateInscription: string;

    @IsNotEmpty()
    @IsString()
    titreThese: string;

    @IsNotEmpty()
    @IsString()
    uniteRecherche: string;

    @IsNotEmpty()
    @IsString()
    directeurThese: string;

    @IsNotEmpty()
    @IsString()
    financement: string;
}