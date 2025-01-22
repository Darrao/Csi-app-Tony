import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';


dotenv.config(); // Charge les variables d'environnement

console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);

export const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // Remplace par le serveur SMTP que tu as reçu
    port: parseInt(process.env.SMTP_PORT || '465', 10), // Convertit en nombre
    secure: process.env.SMTP_SECURE === 'true', // false pour TLS explicite
    auth: {
        user: process.env.SMTP_USER, // Ton nom d'utilisateur
        pass: process.env.SMTP_PASS, // Le mot de passe associé à l'email
    },
});

export const generateToken = (email: string): string => {
    return crypto.createHash('sha256').update(email + Date.now().toString()).digest('hex');
};

export const sendMail = async (to: string, subject: string, html: string) => {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject,
        html,
    };

    try {
        console.log(`Préparation de l'envoi de l'email à ${to}`);
        console.log('Mail options:', mailOptions);

        console.log('Vérification de la connexion SMTP...');
        await transporter.verify();
        console.log('Connexion SMTP réussie.');

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email envoyé à ${to} :`, info.response);
        return info;
    } catch (error) {
        console.error(`Erreur lors de l'envoi de l'email à ${to} :`, error.message);
        throw error;
    }
};

const sendTestEmail = async () => {
    try {
        console.log('Test de connexion SMTP...');
        await transporter.verify();
        console.log('Connexion SMTP réussie.');

        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: 'elio.darras@gmail.com',
            subject: 'Test SMTP',
            text: 'Ceci est un test d\'envoi d\'email via Nodemailer.',
        });

        console.log('Email envoyé avec succès :', info.response);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'e-mail :', error.message);
    }
};

sendTestEmail();