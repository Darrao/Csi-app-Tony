import { Body, Controller, Post } from '@nestjs/common';
import { sendMail, generateToken } from './email.service';
import { TokenService } from '../token/token.service';

@Controller('email')
export class EmailController {
    constructor(private readonly tokenService: TokenService) {}

    @Post('send')
    async sendEmails(@Body('emails') emails: string[]) {
        console.log('Route /email/send appelée avec emails :', emails);
        try {
            for (const email of emails) {
                console.log(`Traitement de l'email : ${email}`);
                const token = generateToken(email);
                await this.tokenService.saveToken(token, email, 'doctorant'); // Inclut les propriétés manquantes

                const link = `http://localhost:3001/formulaire?token=${token}`;
                const subject = 'Formulaire à remplir';
                const html = `<p>Cliquez sur le lien suivant pour remplir vos informations :</p>
                            <a href="${link}">${link}</a>`;
                console.log(`Envoi de l'email à : ${email}`);
                await sendMail(email, subject, html);
                console.log(`Email envoyé à : ${email}`);
            }
            return { message: 'Emails envoyés avec succès.' };
        } catch (error) {
            console.error('Erreur dans la route /email/send :', error.message);
            return { message: 'Erreur lors de l\'envoi des emails.', error: error.message };
        }
    }

    @Post('validate-token')
    async validateToken(@Body('token') token: string, @Body('expectedType') expectedType: string) {
        console.log('Token reçu :', token);

        const { valid, email, type } = await this.tokenService.validateToken(token);
        console.log('Validation du token :', { valid, email, type });

        if (!valid) {
            return { valid: false, message: 'Token invalide ou expiré.' };
        }

        if (expectedType && type !== expectedType) {
            return { valid: false, message: `Ce lien n'est pas valide pour un ${expectedType}.` };
        }

        return { valid: true, email, type };
    }

    @Post('send-single')
    async sendSingleEmail(@Body('email') email: string) {
        try {
            const token = generateToken(email);
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

    @Post('send-representant-tokens')
    async sendTokensToRepresentants(
        @Body('email') doctorantEmail: string,
        @Body('representants') representants: string[]
    ) {
        try {
            const tokens = [];
            for (const representantEmail of representants) {
                const token = generateToken(representantEmail);
                await this.tokenService.saveToken(token, representantEmail, 'representant'); // Stocke le token en base

                const link = `http://localhost:3001/formulaire-representant?token=${token}`;
                const subject = 'Formulaire à remplir pour le représentant';
                const html = `<p>Un doctorant a rempli son formulaire. Veuillez remplir les champs requis :</p>
                              <a href="${link}">${link}</a>`;
                await sendMail(representantEmail, subject, html);
                tokens.push({ email: representantEmail, token });
            }

            return { message: 'Tokens générés et emails envoyés aux représentants.', tokens };
        } catch (error) {
            return { message: 'Erreur lors de l\'envoi des tokens aux représentants.', error };
        }
    }
}