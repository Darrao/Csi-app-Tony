import { Body, Controller, Post, NotFoundException } from '@nestjs/common';
import { sendMail, generateToken, sendMailWithCC, sendMailDynamic } from './email.service';
import { TokenService } from '../token/token.service';
import { DoctorantService } from '../doctorant/doctorant.service'; // ➕ Import du service
import { generateReferentToken, verifyTokenAndFindDoctorant } from './email.service';
import { EmailConfigService } from '../emailConfig/email-config.service';

@Controller('email')
export class EmailController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly doctorantService: DoctorantService, // ➕ Injection du service
        private readonly emailConfigService: EmailConfigService
    ) {}

    @Post('send')
    async sendEmails(
        @Body('emails') emails: string[],
        @Body('doctorantPrenom') doctorantPrenom: string,
        @Body('doctorantEmail') doctorantEmail: string,
        @Body('directeurTheseEmail') directeurTheseEmail: string
    ) {
        console.log('Route /email/send appelée avec emails :', emails);
        console.log('Doctorant prénom :', doctorantPrenom);
        console.log('Directeur de Thèse (CC) :', directeurTheseEmail);

        try {
            // 🔍 Récupération de la configuration email depuis la BDD
            const emailConfig = await this.emailConfigService.getEmailConfig();
            if (!emailConfig) {
                throw new NotFoundException('Configuration email introuvable.');
            }

            console.log(`✅ Configuration email récupérée.`);

            // 🔍 Récupération des données du doctorant
            const doctorant = await this.doctorantService.findByEmail(doctorantEmail);
            if (!doctorant) {
                return { message: "Doctorant introuvable." };
            }

            console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom}, Email: ${doctorant.email}`);

            // 📄 Génération du PDF
            const pdfBuffer = await this.doctorantService.generateNewPDF(doctorant);
            const pdfFileName = `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`;

            // 🔗 Génération des liens dynamiques
            const presentationTemplate = emailConfig.presentationTemplate;
            const csiProposalLink = emailConfig.csiProposalLink;
            const contactLink = emailConfig.contactLink;

            for (const email of emails) {
                console.log(`Traitement de l'email : ${email}`);

                // 🏷 Génération du token
                const token = await generateToken(email, this.doctorantService, doctorantEmail);
                await this.tokenService.saveToken(token, email, 'doctorant');

                const link = `http://localhost:3001/formulaire?token=${token}`;

                // 🔄 Remplacement des variables dans le template `formCsiMember`
                const emailTemplate = emailConfig.formCsiMember;
                const emailContent = this.emailConfigService.replaceEmailVariables(emailTemplate, {
                    doctorantPrenom,
                    link,
                    presentationTemplate,
                    csiProposalLink,
                    contactLink
                });

                const subject = `CSI Evaluation for ${doctorantPrenom}`;
                const attachments = [{ filename: pdfFileName, content: pdfBuffer, contentType: 'application/pdf' }];

                console.log(`📧 Envoi de l'email à : ${email}`);
                await sendMail(email, subject, emailContent, attachments);
                console.log(`✅ Email envoyé à : ${email}`);
            }

            // 🔥 Mise à jour du statut dans la base
            if (doctorant && doctorant._id instanceof Object) {
                await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
                    sendToRepresentants: true,
                    NbSendToRepresentants: (doctorant.NbSendToRepresentants || 0) + 1
                });
            } else {
                console.error("❌ Erreur: `doctorant._id` est invalide :", doctorant);
            }

            // 🏷 Génération du token pour le doctorant
            const doctorantToken = await generateToken(doctorantEmail, this.doctorantService, doctorantEmail);
            await this.tokenService.saveToken(doctorantToken, doctorantEmail, 'doctorant');

            const doctorantLink = `http://localhost:3001/formulaire?token=${doctorantToken}`;

            // 🔄 Remplacement des variables dans le template `doctorantSubmit`
            const doctorantTemplate = emailConfig.doctorantSubmit;
            const doctorantContent = this.emailConfigService.replaceEmailVariables(doctorantTemplate, {
                doctorantPrenom,
                doctorantLink,
                presentationTemplate,
                csiProposalLink,
                contactLink
            });

            const doctorantSubject = `Your CSI Annual Report - ${doctorantPrenom}`;
            const doctorantAttachments = [{ filename: pdfFileName, content: pdfBuffer, contentType: 'application/pdf' }];

            console.log(`📧 Envoi de l'email au doctorant : ${doctorantEmail}`);
            console.log(`📧 Envoi de l'email au directeur de thèse : ${directeurTheseEmail}`);

            await sendMailWithCC(doctorantEmail, doctorantSubject, doctorantContent, doctorantAttachments, directeurTheseEmail);

            console.log(`✅ Email envoyé au doctorant : ${doctorantEmail}`);

            return { message: 'Emails envoyés avec succès.' };
        } catch (error) {
            console.error('❌ Erreur dans la route /email/send :', error.message);
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

    // Il va falloirt rajouter cc attendre les instructions de Tony
    @Post('send-department')
    async sendEmailByDepartment(
        @Body('doctorantId') doctorantId: string,
        @Body('doctorantEmail') doctorantEmail: string,
        @Body('doctorantPrenom') doctorantPrenom: string,
        @Body('doctorantNom') doctorantNom: string,
        @Body('department') department: string
    ) {
        try {
            // 🔍 Récupération de la configuration email depuis la BDD
            const emailConfig = await this.emailConfigService.getEmailConfig();
            if (!emailConfig) {
                throw new NotFoundException('Configuration email introuvable.');
            }

            console.log(`✅ Configuration email récupérée.`);

            // 🔍 Récupération du doctorant
            const doctorant = await this.doctorantService.findOne(doctorantId);
            if (!doctorant) {
                throw new NotFoundException("Doctorant introuvable.");
            }

            console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom}`);

            // 🎯 Récupération des destinataires pour le département
            const departmentGroup = emailConfig[department as keyof EmailConfigService] as { recipient: string[]; cc: string[] };
            if (!departmentGroup) {
                throw new NotFoundException(`Aucun destinataire défini pour le département : ${department}`);
            }

            const recipientEmails = departmentGroup.recipient;
            const ccEmails = departmentGroup.cc;

            if (recipientEmails.length === 0) {
                throw new NotFoundException(`Aucun email de destinataire défini pour ${department}.`);
            }

            console.log(`📬 Destinataires principaux : ${recipientEmails.join(', ')}`);
            console.log(`📬 En copie (CC) : ${ccEmails.join(', ')}`);

            // 🏷️ Génération du token pour le formulaire
            const token = await generateToken(doctorantEmail, this.doctorantService, doctorantEmail);
            const link = `http://localhost:3001/formulaire?token=${token}`;

            // 📄 Génération du PDF
            const pdfBuffer = await this.doctorantService.generateNewPDF(doctorant);
            const pdfFileName = `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`;

            // ✉️ Construction du contenu de l'email depuis la config
            const emailTemplate = emailConfig.CsiMemberHasSubmitForDirector;

            // 🏷 Remplacement des variables dynamiques via emailConfigService
            const emailContent = this.emailConfigService.replaceEmailVariables(emailTemplate, {
                department,
                doctorantPrenom,
                doctorantNom,
                doctorantEmail,
                link, // Ajoute d'autres variables si nécessaire
            });
            
            const subject = `Evaluation CSI - ${doctorantPrenom}`;

            const attachments = [
                {
                    filename: pdfFileName,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ];

            console.log(`📧 Envoi de l'email aux destinataires...`);
            await sendMailDynamic(recipientEmails, subject, emailContent, attachments, ccEmails);

            // 🔥 Mise à jour du statut dans la base pour les représentants et le directeur
            if (doctorant && doctorant._id instanceof Object) {
                await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
                    gestionnaireDirecteurValide: true,
                });
            } else {
                console.error("❌ Erreur: `doctorant._id` est invalide :", doctorant);
            }

            return { message: `Email envoyé avec succès à ${recipientEmails.join(', ')}` };
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de l\'email :', error.message);
            throw new NotFoundException('Erreur lors de l\'envoi de l\'email.');
        }
    }

    @Post('send-referent-confirmation')
    async sendReferentConfirmation(
        @Body('doctorantId') doctorantId: string,
        @Body('doctorantEmail') doctorantEmail: string,
        @Body('doctorantPrenom') doctorantPrenom: string,
        @Body('doctorantNom') doctorantNom: string
    ) {
        try {
            // 🔍 Récupération de la configuration email depuis la BDD
            const emailConfig = await this.emailConfigService.getEmailConfig();
            if (!emailConfig) {
                throw new NotFoundException('Configuration email introuvable.');
            }

            console.log(`✅ Configuration email récupérée.`);

            // 🔍 Récupération du doctorant
            const doctorant = await this.doctorantService.findOne(doctorantId);
            if (!doctorant) {
                throw new NotFoundException("Doctorant introuvable.");
            }

            console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom}`);

            // 📩 Récupération des emails des référents
            const referents = [doctorant.emailMembre1, doctorant.emailMembre2, doctorant.emailAdditionalMembre]
                .filter(email => email); // ⚠️ Supprime les valeurs nulles

            if (referents.length === 0) {
                console.warn("⚠️ Aucun référent trouvé pour ce doctorant.");
                return { message: "Aucun référent à notifier." };
            }

            console.log(`📬 Référents à notifier : ${referents.join(", ")}`);

            // 📄 Génération du PDF
            const pdfBuffer = await this.doctorantService.generateNewPDF(doctorant);
            const pdfFileName = `Rapport_${doctorant.nom}_${doctorant.prenom}.pdf`;

            // 📝 Récupération du template d'email
            const emailTemplate = emailConfig.thanksForSubmitCsiMember;

            // 🔄 Remplacement des variables dynamiques
            const emailContent = this.emailConfigService.replaceEmailVariables(emailTemplate, {
                doctorantPrenom,
                doctorantNom,
                doctorantEmail
            });

            const subject = `Final CSI Report - ${doctorantPrenom} ${doctorantNom}`;
            const attachments = [{ filename: pdfFileName, content: pdfBuffer, contentType: 'application/pdf' }];

            // 🔄 Envoi des emails aux référents
            for (const referentEmail of referents) {
                console.log(`📧 Envoi de l'email à ${referentEmail}`);
                await sendMail(referentEmail, subject, emailContent, attachments);
            }

            return { message: `Emails envoyés avec succès aux référents : ${referents.join(', ')}` };
        } catch (error) {
            console.error('❌ Erreur lors de l\'envoi de l\'email aux référents :', error.message);
            throw new NotFoundException('Erreur lors de l\'envoi de l\'email aux référents.');
        }
    }
}