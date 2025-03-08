import { Body, Controller, Get, Post, Param, Delete, Put, Res, NotFoundException, UploadedFile, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
import * as multer from 'multer';
import { Multer, diskStorage } from 'multer';
import * as path from 'path';
import { format } from 'fast-csv';



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
    async create(@Body() createDoctorantDto: CreateDoctorantDto) {
        console.log('Données reçues pour créer un doctorant :', createDoctorantDto);
        return await this.doctorantService.create(createDoctorantDto);
    }

    @Get()
    async findAll() {
        return this.doctorantService.findAll();
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.doctorantService.delete(id);
    }

    //pour doctorant
    @Put(':id')
    async update(@Param('id') id: string, @Body() updateDoctorantDto: CreateDoctorantDto) {
        console.log(`🔄 Mise à jour du doctorant ${id} avec`, updateDoctorantDto);
        return this.doctorantService.update(id, updateDoctorantDto);
    }

    // pour referent
    // @Put(':id')
    // async updateDoctorant(@Param('id') id: string, @Body() updateDoctorantDto: CreateDoctorantDto) {
    //     console.log(`🔄 Mise à jour du doctorant ${id} avec`, updateDoctorantDto);
    //     return this.doctorantService.update(id, updateDoctorantDto);
    // }

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

    // il faut specifier dans un des mails que le co directeur sera pas dans la boucle
    @Post('send-link/:id')
    async sendLink(@Param('id') id: string, @Body('email') email: string, @Body('prenom') prenom: string) {
        const link = `http://localhost:3001/modifier/${id}`;
        const csiProposalLink = `https://docs.google.com/forms/d/e/1FAIpQLSeuwINiVrU4fOpjRGshwh7kVe356o-xKtjITv2dpFvLlHDwHQ/viewform`;
        const contactLink = `https://ed562.u-paris.fr/en/pages-anglais/communicate-with-us/`;
        const template = `https://cloud.parisdescartes.fr/index.php/s/qi86RQiggokBnnb`;

        const subject = 'Important: Instructions for Your Annual Report Submission';
        
        const html = `
            <p>Dear <strong>${prenom}</strong>,</p>

            <p>Before proceeding with your annual report, please ensure that your CSI committee has been officially validated by your BioSPC Department (otherwise, you can submit your committee here: <a href="${csiProposalLink}" style="color: blue; text-decoration: underline;">Proposal for CSI committee members</a>). You must not proceed further until this validation is confirmed.</p>


            <p>If your committee has been validated, you can now complete your annual report. Please follow this link to submit your report: <a href="${link}" style="color: blue; text-decoration: underline;">[LINK]</a></p>

            <p>Once you submit your report (<strong>at least 48 hours before your interview</strong>), it will be automatically sent to your committee members. <strong>Make sure to enter their email addresses correctly.</strong></p>

            <p><strong>Remember that you are responsible for:</strong></p>

            <p>✔ Scheduling a date that suits your committee members and supervisor.</p>
            <p>✔ Informing all CSI participants of the date and venue.</p>
            <p>✔ Booking a room for the meeting.</p>
            <p>✔ you are strongly encouraged to use <a href="${template}" style="color: blue; text-decoration: underline;">the presentation templates</a>.</p>
            <p>✔ We ask that you give preference to <strong>on-site interviews</strong>. Doctoral students and/or their supervisors will be responsible for setting up a videoconference link if some committee members need to attend the interview remotely.</p>

            <p>We recommend that the meeting lasts <strong>at least 45 minutes</strong>, with additional time allocated for your committee to <strong>write their report immediately after the meeting.</strong></p>

            <h3>📅 Important Deadlines</h3>
            <p>Ensure that your interview is scheduled in accordance with the following deadlines, as we must receive the final report from your CSI committee by:</p>
            <ul>
                <li><strong>D1 and D2:</strong> October 15</li>
                <li><strong>D3 applying for a 4th year with new funding:</strong> End of July (to ensure salary payment in October)</li>
                <li><strong>D1, D2, D3 applying for VISA renewal:</strong> End of July (as prefecture procedures can be very lengthy)</li>
            </ul>

            <p>If you have any questions, please do not hesitate to contact us on the generic department email addresses that are listed <a href="${contactLink}" style="color: blue; text-decoration: underline;">on this link</a>.</p>

            <p>Best regards,</p>
            <p><strong>BioSPC Doctoral School Management</strong></p>
        `;
        try {
            await sendMail(email, subject, html);



            // 🔥 Mise à jour du statut dans la base
            const doctorant = await this.doctorantService.findByEmail(email);
            console.log('minouuuuuu')
            if (doctorant) {
                console.log(doctorant._id)

                if (doctorant && doctorant._id instanceof Object) {
                    console.log('miaouuuu')

                    await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
                        sendToDoctorant: true,
                        NbSendToDoctorant: (doctorant.NbSendToDoctorant || 0) + 1
                    });
                    console.log('fini itération')
                } else {
                    console.error("❌ Erreur: `doctorant._id` est invalide :", doctorant);
                }
            }        
            
            

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
        if (!doctorant) {
            console.error('Erreur : Doctorant introuvable.', { doctorantEmail });
            return { message: 'Doctorant introuvable.', success: false };
        }

        /*
        // Gestion des représentants (mise en commentaire pour l'instant)
        const updatedData =
            role === 'representant1'
                ? { representant1Choices: choices }
                : { representant2Choices: choices };

        const updatedRepresentantData = {
            ...doctorant.representantData,
            ...updatedData,
        };

        // Détermination du statut (mise en commentaire)
        const statut =
            updatedRepresentantData.representant1Choices?.choix1 &&
            updatedRepresentantData.representant1Choices?.choix2 &&
            updatedRepresentantData.representant2Choices?.choix1 &&
            updatedRepresentantData.representant2Choices?.choix2
                ? 'complet'
                : 'en attente';

        const updatedDoctorant = await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
            representantData: updatedRepresentantData,
            statut,
        });

        console.log('Statut mis à jour :', statut);
        return { message: 'Données sauvegardées.', doctorant: updatedDoctorant };
        */

        return { message: 'Données reçues, mais gestion des représentants désactivée.', success: true };
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
            const token1 = await generateToken(data.email1, this.doctorantService, doctorant.email);
            await this.tokenService.saveToken(token1, data.email1, 'representant', doctorant.email); // 🔥 Stocke aussi le doctorant

            const link1 = `http://localhost:3001/formulaire-representant?token=${token1}`;
            const subject1 = 'Formulaire à remplir pour le représentant';
            const html1 = `<p>Un doctorant a rempli son formulaire. Veuillez remplir les champs requis :</p>
                        <a href="${link1}">${link1}</a>`;

            console.log(`[EMAIL] Envoi à ${data.email1} avec le lien : ${link1}`);

            try {
                const result1 = await sendMail(data.email1, subject1, html1);
                console.log(`[EMAIL] ✅ Email envoyé avec succès à ${data.email1}. Réponse SMTP:`, result1.response);
            } catch (error) {
                console.error(`[EMAIL] Échec de l'envoi à ${data.email1}:`, error);
            }

            tokens.push({ email: data.email1, token: token1 });
        }

        if (data.email2) {
            console.log(`[EMAIL] Génération du token pour le référent 2: ${data.email2}`);
            const token2 = await generateToken(data.email2, this.doctorantService, doctorant.email);
            await this.tokenService.saveToken(token2, data.email2, 'representant', doctorant.email);

            const link2 = `http://localhost:3001/formulaire-representant?token=${token2}`;
            const subject2 = 'Formulaire à remplir pour le représentant';
            const html2 = `<p>Un doctorant a rempli son formulaire. Veuillez remplir les champs requis :</p>
                        <a href="${link2}">${link2}</a>`;

            console.log(`[EMAIL] Envoi à ${data.email2} avec le lien : ${link2}`);

            try {
                const result2 = await sendMail(data.email2, subject2, html2);
                console.log(`[EMAIL] ✅ Email envoyé avec succès à ${data.email2}. Réponse SMTP:`, result2.response);
            } catch (error) {
                console.error(`[EMAIL] Échec de l'envoi à ${data.email2}:`, error);
            }

            tokens.push({ email: data.email2, token: token2 });
        }

        return { message: 'Emails envoyés aux référents.', tokens };
    }

    @Get('export/csv')
    async exportDoctorants(@Res() res: Response) {
        const doctorants = await this.doctorantModel.find().lean(); // ✅ Récupère les doctorants en JSON

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=doctorants.csv');

        const csvStream = format({ headers: true });
        csvStream.pipe(res);

        // 🔥 Récupération automatique des champs du schema Mongoose
        const schemaFields = Object.keys(this.doctorantModel.schema.paths);

        // ⚡ Génération des lignes du CSV automatiquement
        doctorants.forEach(doc => {
            const row: any = {};
            schemaFields.forEach(field => {
                let value = doc[field];

                // 🔄 Convertir les dates en `YYYY-MM-DD`
                if (value instanceof Date) {
                    value = value.toISOString().split('T')[0];
                }

                row[field] = value ?? ''; // ✅ Évite les `undefined`
            });

            csvStream.write(row);
        });

        csvStream.end(); // ✅ Fin du stream
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

        // 🔥 Correction : Ajout de `this.doctorantService` en deuxième argument
        const token = await generateToken(email, this.doctorantService, doctorant.email);

        const subject = "Rappel : Merci de remplir votre formulaire";
        const link = `http://localhost:3001/formulaire?token=${token}`;
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
            const doctorants = await this.doctorantService.findAll();
            if (doctorants.length === 0) {
                return res.status(404).json({ message: 'Aucun doctorant trouvé.' });
            }

            res.setHeader('Content-Disposition', 'attachment; filename="doctorants.pdf"');
            res.setHeader('Content-Type', 'application/pdf');

            const pdfBuffer = await this.doctorantService.generateNewPDF(doctorants[0]); 
            res.send(pdfBuffer);
        } catch (error) {
            res.status(500).json({ message: 'Erreur lors de la génération du PDF.', error: error.message });
        }
    }


    @Get('export/pdf/:id')
    async exportDoctorantPDF(@Param('id') id: string, @Res() res: Response) {
        try {
            console.log(`📥 Demande d'export du PDF pour l'ID : ${id}`);

            const doctorant = await this.doctorantService.findOne(id);
            if (!doctorant) {
                console.error(`❌ Doctorant introuvable avec ID : ${id}`);
                return res.status(404).json({ message: "Doctorant introuvable" });
            }

            console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom}`);

            const pdfBuffer = await this.doctorantService.generateNewPDF(doctorant);

            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Rapport_${doctorant.nom}_${doctorant.prenom}.pdf"`
            });

            console.log(`📄 PDF généré avec succès pour ${doctorant.nom} ${doctorant.prenom}`);
            return res.send(pdfBuffer);
        } catch (error) {
            console.error("❌ Erreur lors de la génération du PDF :", error);
            return res.status(500).json({ message: "Erreur lors de la génération du PDF", error: error.message });
        }
    }
    @Post('import-csv')
    @UseInterceptors(FileInterceptor('file'))
    async importDoctorantsCSV(@UploadedFile() file: Multer.File, @Res() res: Response) {
        if (!file) {
            return res.status(400).json({ message: 'Aucun fichier fourni.' });
        }

        try {
            const result = await this.doctorantService.importDoctorantsFromCSV(file.buffer.toString('utf8'));
            return res.status(200).json({ message: 'Importation terminée.', result });
        } catch (error) {
            console.error('Erreur lors de l’importation CSV :', error);
            return res.status(500).json({ message: 'Erreur interne', error: error.message });
        }
    }

    @Post('upload/:id')
    @UseInterceptors(FilesInterceptor('fichiersExternes', 5, {
        storage: diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join('uploads/doctorants', req.params.id);
    
                // 🔥 Vérifie si le dossier existe, sinon le crée
                if (!fs.existsSync(uploadPath)) {
                    fs.mkdirSync(uploadPath, { recursive: true });
                }
    
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            // 🔥 Vérifie si l'extension est valide
            if (!file.originalname.match(/\.(pdf|docx|txt)$/)) {
                return cb(new BadRequestException('Seuls les fichiers PDF, DOCX et TXT sont autorisés.'), false);
            }
            cb(null, true);
        },
    }))
    async uploadFiles(@Param('id') id: string, @UploadedFiles() files: Multer.File[]) {
        if (!files || files.length === 0) {
            throw new NotFoundException("Aucun fichier reçu.");
        }
    
        const doctorant = await this.doctorantService.getDoctorant(id);
        if (!doctorant) {
            throw new NotFoundException("Doctorant non trouvé.");
        }
    
        // Transforme les fichiers reçus en objets FichierExterne
        const fichiersAjoutes = files.map(file => ({
            nomOriginal: file.originalname,
            cheminStockage: file.path,
        }));
    
        // 🌟 On garde uniquement les 2 derniers fichiers (les nouveaux écrasent les anciens)
        const fichiersFinals = [...fichiersAjoutes].slice(-2);
    
        // 🔥 Met à jour les fichiers dans la base MongoDB
        await this.doctorantService.updateDoctorant(id, { fichiersExternes: fichiersFinals });
    
        return { message: "Fichiers uploadés avec succès", fichiersExternes: fichiersFinals };
    }

    @Get(':id')
    async getDoctorant(@Param('id') id: string) {
        const doctorant = await this.doctorantService.getDoctorant(id);
        if (!doctorant) throw new NotFoundException("Doctorant non trouvé.");
        return doctorant;
    }

    @Put(':id/update-email-status')
    async updateEmailStatus(@Param('id') id: string, @Body() body: any) {
        const { sendToDoctorant, sendToRepresentants } = body;

        const updateData: any = {};

        if (sendToDoctorant) {
            updateData.sendToDoctorant = true;
            updateData.$inc = { NbSendToDoctorant: 1 }; // Incrémente de 1
        }
        if (sendToRepresentants) {
            updateData.sendToRepresentants = true;
            updateData.$inc = { NbSendToRepresentants: 1 }; // Incrémente de 1
        }

        return await this.doctorantService.updateDoctorant(id, updateData);
    }

    @Delete()
    async deleteAll() {
        try {
            const result = await this.doctorantService.deleteAll(); // 🔥 Appel au service pour supprimer tous les doctorants
            return { message: 'Tous les doctorants ont été supprimés avec succès.', deletedCount: result.deletedCount };
        } catch (error) {
            console.error('Erreur lors de la suppression des doctorants :', error);
            throw new BadRequestException("Erreur lors de la suppression des doctorants.");
        }
    }
}