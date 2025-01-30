import { Body, Controller, Get, Post, Param, Delete, Put } from '@nestjs/common';
import { DoctorantService } from './doctorant.service';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';
import { sendMail } from '../email/email.service';

@Controller('doctorant')
export class DoctorantController {
    constructor(private readonly doctorantService: DoctorantService) {}

    @Post()
    async create(@Body() createDoctorantDto: any) {
        console.log('Données reçues pour créer un doctorant :', createDoctorantDto);
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
        const normalizedEmail = email.trim().toLowerCase();
        console.log('Recherche par email (normalisé) :', normalizedEmail);
        const doctorant = await this.doctorantService.findByEmail(normalizedEmail);

        if (!doctorant) {
            console.error('Aucun doctorant trouvé pour cet email.');
            return { message: 'Doctorant introuvable.' };
        }

        console.log('Doctorant trouvé :', doctorant);
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
        const { doctorantEmail, role, choices } = data;

        if (!doctorantEmail || !choices || !role) {
            return { message: 'Données incomplètes.', success: false };
        }

        const doctorant = await this.doctorantService.findByEmail(doctorantEmail);
        if (!doctorant || !doctorant.representantData) {
            console.error('Erreur : Doctorant ou données des représentants manquantes.', { doctorant }); // Ajouté
            return { message: 'Doctorant introuvable ou données invalides.', success: false };
        }

        const updatedData =
            role === 'representant1'
                ? { representant1Choices: choices }
                : { representant2Choices: choices };

        const updatedRepresentantData = {
            ...doctorant.representantData,
            ...updatedData,
        };

        const updatedDoctorant = await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
            representantData: updatedRepresentantData,
        });

        return { message: 'Données sauvegardées.', doctorant: updatedDoctorant };
    }
}