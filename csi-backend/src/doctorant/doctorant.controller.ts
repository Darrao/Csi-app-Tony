import { Body, Controller, Get, Post, Param, Delete, Put, Res, NotFoundException } from '@nestjs/common';
import { DoctorantService } from './doctorant.service';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';
import { sendMail } from '../email/email.service';
import { generateToken } from '../email/email.service';
import { TokenService } from '../token/token.service';
import { Doctorant } from './schemas/doctorant.schema';

import { Response } from 'express';
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';


@Controller('doctorant')
export class DoctorantController {
    constructor(
        private readonly doctorantService: DoctorantService,
        private readonly tokenService: TokenService,
        @InjectModel(Doctorant.name) private readonly doctorantModel: Model<Doctorant>
    ) {}

    @Get('refresh-statuses')
    async refreshStatuses(): Promise<any> {
        console.log('testest');

        try {
            const doctorants = await this.doctorantService.findAll();
            console.log('[CONTROLLER] ✅ Données des doctorants récupérées:', doctorants);

            if (doctorants.length === 0) {
                console.error('Aucun doctorant trouvé.');
                return { message: 'Aucun doctorant trouvé.' };
            }

            return doctorants;
        } catch (error) {
            console.error('[CONTROLLER] Erreur lors de la récupération des doctorants :', error);
            return { message: 'Erreur lors de la récupération des doctorants.', error: error.message };
        }
    }

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
            console.error('Erreur : Doctorant ou données des représentants manquantes.', { doctorant });
            return { message: 'Doctorant introuvable ou données invalides.', success: false };
        }

        // Mise à jour des choix selon le rôle du représentant
        const updatedData =
            role === 'representant1'
                ? { representant1Choices: choices }
                : { representant2Choices: choices };

        const updatedRepresentantData = {
            ...doctorant.representantData,
            ...updatedData,
        };

        // Vérification des champs pour déterminer le statut
        const statut =
            updatedRepresentantData.representant1Choices?.choix1 &&
            updatedRepresentantData.representant1Choices?.choix2 &&
            updatedRepresentantData.representant2Choices?.choix1 &&
            updatedRepresentantData.representant2Choices?.choix2
                ? 'complet'
                : 'en attente';

        // Mise à jour du doctorant avec le statut et les nouvelles données
        const updatedDoctorant = await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
            representantData: updatedRepresentantData,
            statut,
        });

        console.log('Statut mis à jour :', statut); // Vérifiez si "complet" est bien affiché ici
        return { message: 'Données sauvegardées.', doctorant: updatedDoctorant };
    }

    @Post('send-representant-tokens/:id')
    async sendRepresentantTokens(@Param('id') id: string, @Body() data: { email1: string; email2: string }) {
        const doctorant = await this.doctorantService.findOne(id);
        if (!doctorant) {
            console.error('[ERROR] Doctorant introuvable pour l\'ID:', id);
            return { message: 'Doctorant introuvable.' };
        }

        const tokens = [];

        console.log(`[EMAIL] Envoi d'emails aux référents du doctorant ${doctorant.nom} ${doctorant.prenom}:`);

        if (data.email1) {
            console.log(`[EMAIL] Génération du token pour le référent 1: ${data.email1}`);
            const token1 = generateToken(data.email1);
            await this.tokenService.saveToken(token1, data.email1, 'representant', doctorant.email);

            const link1 = `http://localhost:3001/formulaire-representant?token=${token1}`;
            const subject1 = 'Formulaire à remplir pour le représentant';
            const html1 = `<p>Un doctorant a rempli son formulaire. Veuillez remplir les champs requis :</p>
                        <a href="${link1}">${link1}</a>`;

            console.log(`[EMAIL] Envoi à ${data.email1} avec le lien : ${link1}`);

            try {
                const result1 = await sendMail(data.email1, subject1, html1);
                console.log(`[EMAIL] Email envoyé avec succès à ${data.email1}. Réponse SMTP:`, result1.response);
            } catch (error) {
                console.error(`[EMAIL] Échec de l'envoi à ${data.email1}:`, error);
            }

            tokens.push({ email: data.email1, token: token1 });
        }

        if (data.email2) {
            console.log(`[EMAIL] Génération du token pour le référent 2: ${data.email2}`);
            const token2 = generateToken(data.email2);
            await this.tokenService.saveToken(token2, data.email2, 'representant', doctorant.email);

            const link2 = `http://localhost:3001/formulaire-representant?token=${token2}`;
            const subject2 = 'Formulaire à remplir pour le représentant';
            const html2 = `<p>Un doctorant a rempli son formulaire. Veuillez remplir les champs requis :</p>
                        <a href="${link2}">${link2}</a>`;

            console.log(`[EMAIL] Envoi à ${data.email2} avec le lien : ${link2}`);

            try {
                const result2 = await sendMail(data.email2, subject2, html2);
                console.log(`[EMAIL] Email envoyé avec succès à ${data.email2}. Réponse SMTP:`, result2.response);
            } catch (error) {
                console.error(`[EMAIL] Échec de l'envoi à ${data.email2}:`, error);
            }

            tokens.push({ email: data.email2, token: token2 });
        }

        return { message: 'Emails envoyés aux référents.', tokens };
    }

    @Get('export/csv')
    async exportDoctorants(@Res() res: Response) {
        const doctorants = await this.doctorantService.findAll();
        const csv = doctorants.map((doc) => ({
            nom: doc.nom,
            prenom: doc.prenom,
            email: doc.email,
            dateInscription: doc.dateInscription,
            titreThese: doc.titreThese,
            uniteRecherche: doc.uniteRecherche,
            directeurThese: doc.directeurThese,
            financement: doc.financement,
            referent1Choices: JSON.stringify(doc.representantData?.saisieChamp1 || {}),
            referent2Choices: JSON.stringify(doc.representantData?.saisieChamp2 || {}),
        }));

        res.header('Content-Type', 'text/csv');
        res.attachment('doctorants.csv');
        res.send(csv);
    }

    @Post('send-reminder')
    async sendReminder(@Body('email') email: string) {
        if (!email) {
            return { message: "Email non fourni." };
        }

        const doctorant = await this.doctorantService.findByEmail(email);
        if (!doctorant) {
            return { message: "Doctorant introuvable." };
        }

        const subject = "Rappel : Merci de remplir votre formulaire";
        const link = `http://localhost:3001/formulaire?token=${generateToken(email)}`;
        const html = `<p>Bonjour,</p>
                    <p>Nous vous rappelons de remplir votre formulaire en suivant ce lien :</p>
                    <a href="${link}">${link}</a>`;

        try {
            await sendMail(email, subject, html);
            return { message: "Rappel envoyé avec succès." };
        } catch (error) {
            console.error("Erreur lors de l'envoi du rappel :", error);
            return { message: "Erreur lors de l'envoi du rappel.", error };
        }
    }

    @Get('export/pdf')
    async exportDoctorantsPDF(@Res() res: Response) {
        try {
            console.log('[PDF] 📌 Début de la génération du PDF.');

            // Récupérer les doctorants
            const doctorants = await this.doctorantService.findAll();

            // Vérifier si la liste est vide
            if (doctorants.length === 0) {
                console.warn('[PDF] ❌ Aucun doctorant trouvé.');
                return res.status(404).json({ message: 'Aucun doctorant trouvé.' });
            }

            // Configuration du PDF
            const doc = new PDFDocument({ margin: 50 });
            res.setHeader('Content-Disposition', 'attachment; filename="doctorants.pdf"');
            res.setHeader('Content-Type', 'application/pdf');

            // Stream du PDF vers la réponse HTTP
            doc.pipe(res);

            // Titre principal
            doc.fontSize(18).text('Liste des Doctorants', { align: 'center' }).moveDown(2);

            // Génération des doctorants
            doctorants.forEach((docItem, index) => {
                doc.fontSize(14).text(`📌 ${docItem.nom.toUpperCase()} ${docItem.prenom}`, { underline: true });
                doc.fontSize(12).text(`📧 Email: ${docItem.email}`);
                doc.text(`🎓 Titre de la thèse: ${docItem.titreThese}`);
                doc.text(`🏢 Unité de recherche: ${docItem.uniteRecherche}`);
                doc.text(`👨‍🏫 Directeur de thèse: ${docItem.directeurThese}`);
                doc.text(`💰 Financement: ${docItem.financement}`);
                doc.text(`📊 Statut: ${docItem.statut === 'complet' ? '✅ Complet' : '⏳ En attente'}`);

                // Informations des représentants
                doc.text(`👤 Représentant 1: ${docItem.representantData?.representantEmail1 || 'Non défini'}`);
                doc.text(`👤 Représentant 2: ${docItem.representantData?.representantEmail2 || 'Non défini'}`);

                // Ajout des champs saisis par les représentants
                if (docItem.representantData?.saisieChamp1 || docItem.representantData?.saisieChamp2) {
                    doc.text(`📝 Avis Représentant 1: ${docItem.representantData?.saisieChamp1 || 'Non rempli'}`);
                    doc.text(`📝 Avis Représentant 2: ${docItem.representantData?.saisieChamp2 || 'Non rempli'}`);
                }

                // Espacement entre chaque doctorant
                if (index !== doctorants.length - 1) {
                    doc.moveDown(2);
                    doc.text('───────────────────────────────', { align: 'center' });
                    doc.moveDown(2);
                }
            });

            // Fin du document
            doc.end();
            console.log('[PDF] ✅ PDF généré avec succès.');

        } catch (error) {
            console.error('[PDF] ❌ Erreur lors de la génération du PDF:', error);
            res.status(500).json({ message: 'Erreur lors de la génération du PDF.', error: error.message });
        }
    }

    @Get('export/pdf/:id')
    async exportDoctorantPDF(@Param('id') id: string, @Res() res: Response) {
        try {
            // Récupérer le doctorant depuis la base de données
            const doctorant = await this.doctorantModel.findById(id).exec();
            if (!doctorant) {
                return res.status(404).json({ message: "Doctorant non trouvé" });
            }

            // Générer le PDF
            const pdfBuffer = await this.doctorantService.generateFilledPDF(doctorant);

            // Envoyer le fichier PDF
            res.setHeader('Content-Disposition', `attachment; filename="doctorant_${doctorant.nom}.pdf"`);
            res.setHeader('Content-Type', 'application/pdf');
            res.send(pdfBuffer);
        } catch (error) {
            console.error("[PDF] ❌ Erreur lors de la génération du PDF :", error);
            res.status(500).json({ message: "Erreur interne lors de la génération du PDF" });
        }
    }
}