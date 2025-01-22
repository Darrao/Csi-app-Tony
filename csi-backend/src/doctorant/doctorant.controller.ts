import { Body, Controller, Get, Post, Param, Delete, Put } from '@nestjs/common';
import { DoctorantService } from './doctorant.service';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';
import { sendMail } from '../email/email.service';

@Controller('doctorant')
export class DoctorantController {
    constructor(private readonly doctorantService: DoctorantService) {}

    @Post()
    async create(@Body() createDoctorantDto: any) {
        console.log('Création d\'un nouveau doctorant avec les données :', createDoctorantDto);
        return this.doctorantService.create(createDoctorantDto);
    }

    @Get()
    async findAll() {
        return this.doctorantService.findAll();
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.doctorantService.delete(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateDoctorantDto: CreateDoctorantDto) {
        return this.doctorantService.update(id, updateDoctorantDto);
    }

    @Get(':idOrEmail')
    async findOne(@Param('idOrEmail') idOrEmail: string) {
        const doctorant = await this.doctorantService.findOne(idOrEmail);
        if (!doctorant) {
            return { message: 'Doctorant introuvable.' };
        }
        return doctorant;
    }

    @Get('by-email/:email')
    async getDoctorantByEmail(@Param('email') email: string) {
        const doctorant = await this.doctorantService.findByEmail(email);
        if (!doctorant) {
            return { message: 'Doctorant introuvable.' };
        }
        return doctorant;
    }

    @Post('send-link/:id')
    async sendLink(@Param('id') id: string, @Body('email') email: string) {
        const link = `http://localhost:3001/modifier/${id}`;
        const subject = 'Lien pour modifier vos informations';
        const html = `<p>Cliquez sur le lien ci-dessous pour modifier vos informations :</p>
                      <a href="${link}">${link}</a>`;

        try {
            await sendMail(email, subject, html);
            return { message: 'Email envoyé avec succès.' };
        } catch (error) {
            return { message: 'Erreur lors de l\'envoi de l\'email.', error };
        }
    }

    @Post('representant')
    async saveRepresentantData(@Body() data: any) {
        const { doctorantEmail, champPlus1, champPlus2 } = data;

        console.log('Données reçues dans /representant :', data);

        if (!doctorantEmail || !champPlus1 || !champPlus2) {
            return { message: 'Tous les champs sont requis.', success: false };
        }

        try {
            // Vérifiez si le doctorant existe
            const doctorant = await this.doctorantService.findByEmail(doctorantEmail);
            console.log('Résultat de findByEmail :', doctorant);

            if (!doctorant) {
                return { message: 'Doctorant introuvable.', success: false };
            }

            // Mettre à jour les données du doctorant
            const updatedDoctorant = await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
                representantData: { champPlus1, champPlus2 }, // Mise à jour directe des champs
            });

            console.log('Doctorant mis à jour avec succès :', updatedDoctorant);

            return { message: 'Données des représentants sauvegardées avec succès.', doctorant: updatedDoctorant };
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des données des représentants :', error);
            return { message: 'Erreur lors de la sauvegarde.', success: false, error: error.message };
        }
    }
}