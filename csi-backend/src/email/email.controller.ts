import { Body, Controller, Post, NotFoundException } from '@nestjs/common';
import { sendMail, generateToken, sendMailWithCC } from './email.service';
import { TokenService } from '../token/token.service';
import { DoctorantService } from '../doctorant/doctorant.service'; // ➕ Import du service
import { generateReferentToken, verifyTokenAndFindDoctorant } from './email.service';

@Controller('email')
export class EmailController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly doctorantService: DoctorantService // ➕ Injection du service
    ) {}

    @Post('send')
    async sendEmails(@Body('emails') emails: string[], @Body('doctorantPrenom') doctorantPrenom: string, @Body('doctorantEmail') doctorantEmail: string, @Body('directeurTheseEmail') directeurTheseEmail: string) {
        console.log('Route /email/send appelée avec emails :', emails);
        console.log('Doctorant prénom :', doctorantPrenom);
        console.log('Directeur de Thèse (CC) :', directeurTheseEmail);
        try {

            // 🔍 Récupération des données du doctorant
            const doctorant = await this.doctorantService.findByEmail(doctorantEmail);
            if (!doctorant) {
                return { message: "Doctorant introuvable." };
            }

            console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom}, Email: ${doctorant.email}`);

            // 📄 Génération du NOUVEAU PDF
            const pdfBuffer = await this.doctorantService.generateNewPDF(doctorant);
            const pdfFileName = `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`;
            for (const email of emails) {
                console.log(`Traitement de l'email : ${email}`);

                // Utilisation de la nouvelle fonction `generateToken()` qui récupère le bon email du doctorant
                const token = await generateToken(email, this.doctorantService, doctorantEmail);
                
                await this.tokenService.saveToken(token, email, 'doctorant'); // Stocke bien avec le bon doctorant

                const link = `http://localhost:3001/formulaire?token=${token}`;
                const subject = `CSI Evaluation for ${doctorantPrenom}`;
                const html = `<p>Dear Colleagues,</p>
                            <p>You are a member of the Comité de Suivi Individuel (CSI) for ${doctorantPrenom}. ${doctorantPrenom} has completed his/her annual report: <a href="${link}" style="color: blue; text-decoration: underline;">[LINK]</a>.</p>
                            <p>Through the same link, you will be able to submit your evaluation. We kindly invite you to do so immediately after the interview.</p>
                            <p>${doctorantPrenom} and his/her PhD supervisor are responsible for scheduling a suitable date for the interview and will inform you of the location. If you need to connect remotely, they will provide you with a link.</p>
                            <p>We sincerely appreciate your contribution in ensuring that the training of our BioSPC students progresses smoothly and successfully.</p>
                            <p>Best regards,</p>
                            <a <strong>The BioSPC Doctoral School Management</strong></a>`;
                const attachments= [
                    {
                        filename: pdfFileName,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
                console.log(`Envoi de l'email à : ${email}`);
                await sendMail(email, subject, html, attachments);
                console.log(`Email envoyé à : ${email}`);

            // 🔥 Mise à jour du statut dans la base
            const doctorant = await this.doctorantService.findByEmail(doctorantEmail);
            console.log('1', doctorant)
            if (doctorant) {
                console.log('2')
                if (doctorant && doctorant._id instanceof Object) {
                    console.log('3')
                    await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
                        sendToRepresentants: true,
                        NbSendToRepresentants: (doctorant.NbSendToRepresentants || 0) + 1
                    });
                } else {
                    console.error("❌ Erreur: `doctorant._id` est invalide :", doctorant);
                }
            }
        }

                        // ✉️ **Envoi d'un email au doctorant**
                        const doctorantToken = await generateToken(doctorantEmail, this.doctorantService, doctorantEmail);
                        await this.tokenService.saveToken(doctorantToken, doctorantEmail, 'doctorant');
        
                        const doctorantLink = `http://localhost:3001/formulaire?token=${doctorantToken}`;
                        const doctorantSubject = `Your CSI Annual Report - ${doctorantPrenom}`;
                        const doctorantHtml = `<p>Dear ${doctorantPrenom},</p>
                                        <p>Your annual CSI report has been successfully submitted.</p>
                                        <p>Best regards,</p>
                                        <p><strong>The BioSPC Doctoral School Management</strong></p>`;
                        const doctorantAttachments= [
                            {
                                                filename: pdfFileName,
                                                content: pdfBuffer,
                                                contentType: 'application/pdf'
                            }
                        ]
        

                        // ajouter directeur de these a l'envois 
                        console.log(`Envoi de l'email au doctorant : ${doctorantEmail}`);
                        console.log(`Envoi de l'email au directeur de thèse : ${directeurTheseEmail}`);
                        await sendMailWithCC(doctorantEmail, doctorantSubject, doctorantHtml, doctorantAttachments, directeurTheseEmail);
                        console.log(`✅ Email envoyé au doctorant : ${doctorantEmail}`);
        
            return { message: 'Emails envoyés avec succès.' };
        } catch (error) {
            console.error('Erreur dans la route /email/send :', error.message);
            return { message: 'Erreur lors de l\'envoi des emails.', error: error.message };
        }
    }

    @Post('/validate-token')
    async validateToken(@Body('token') token: string) {
        console.log(`🔍 Validation du token JWT : ${token}`);

        // 🔥 Récupération correcte du doctorant via le token
        const doctorant = await verifyTokenAndFindDoctorant(token, this.doctorantService);

        if (!doctorant) {
            throw new NotFoundException('Aucun doctorant trouvé avec cet email.');
        }

        console.log(`✅ Doctorant trouvé : ${doctorant.email}`);
        return { message: 'Token valide', doctorant };
    }

    @Post('send-single')
    async sendSingleEmail(
        @Body('email') doctorantEmail: string,  // Email du doctorant concerné
        @Body('email') email: string
    ) {
        try {
            const token = await generateToken(email, this.doctorantService, doctorantEmail);
            await this.tokenService.saveToken(token, email, 'doctorant'); // Stocke le token en base

            const link = `http://localhost:3001/formulaire?token=${token}`;
            const subject = 'Action requise';
            const html = `<p>Cliquez sur le lien suivant pour accéder au formulaire :</p>
                          <a href="${link}">${link}</a>`;
            await sendMail(email, subject, html);
            return { message: `Email envoyé à ${email}` };
        } catch (error) {
            return { message: 'Erreur lors de l\'envoi de l\'email.', error };
        }
    }

    @Post('send-referent-email')
    async sendReferentEmail(@Body('doctorantEmail') doctorantEmail: string) {
        console.log(`🔍 Recherche du doctorant avec email : ${doctorantEmail}`);

        const doctorant = await this.doctorantService.findByEmail(doctorantEmail);
        if (!doctorant) {
            console.log('❌ Doctorant introuvable');
            return { message: "Doctorant introuvable" };
        }

        // Récupération des référents
        const referents = [doctorant.emailMembre1, doctorant.emailMembre2, doctorant.emailAdditionalMembre]
            .filter(email => email); // ⚠️ Supprime les valeurs nulles ou vides

        const emailsSent = [];
        
        for (const referentEmail of referents) {
            // 🔥 Génère un JWT pour chaque référent avec l'email du doctorant
            const token = generateReferentToken(referentEmail, doctorant.email);
            console.log(`📩 Envoi de l'email à ${referentEmail} avec le token : ${token}`);

            const link = `http://localhost:3001/formulaire-referent?token=${token}`;
            const subject = 'Validation du formulaire du doctorant';
            const html = `<p>Le doctorant <strong>${doctorant.prenom} ${doctorant.nom}</strong> a rempli son formulaire.</p>
                        <p>Veuillez compléter les informations requises :</p>
                        <a href="${link}">${link}</a>`;

            await sendMail(referentEmail, subject, html);
            emailsSent.push(referentEmail);
        }

        return { message: `Emails envoyés aux référents : ${emailsSent.join(', ')}` };
    }

    @Post('send-representant-tokens')
    async sendTokensToRepresentants(
        @Body('email') doctorantEmail: string,  // Email du doctorant concerné
        @Body('representants') representants: string[]
    ) {
        try {
            const tokens = [];
            for (const representantEmail of representants) {
                // 🔥 Génération du token AVEC l'email du doctorant
                const token = await generateToken(representantEmail, this.doctorantService, doctorantEmail);
                await this.tokenService.saveToken(token, representantEmail, 'representant', doctorantEmail);

                const link = `http://localhost:3001/formulaire-representant?token=${token}`;
                const subject = 'Formulaire à remplir pour le représentant';
                const html = `<p>Un doctorant (${doctorantEmail}) a rempli son formulaire. Veuillez remplir les champs requis :</p>
                            <a href="${link}">${link}</a>`;
                await sendMail(representantEmail, subject, html);
                tokens.push({ email: representantEmail, token });
            }

            return { message: 'Tokens générés et emails envoyés aux représentants.', tokens };
        } catch (error) {
            console.error('Erreur lors de l\'envoi des tokens aux représentants :', error.message);
            throw error;
        }
    }
}