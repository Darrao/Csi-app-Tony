import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { DoctorantService } from '../doctorant/doctorant.service';
import { JwtPayload } from 'jsonwebtoken';



dotenv.config(); // Charge les variables d'environnement

const SECRET_KEY = process.env.SECRET_KEY || 'fallbackSecret'; // Clé par défaut en cas d'erreur
console.log('SECRET_KEY:', SECRET_KEY);

export function generateReferentToken(referentEmail: string, doctorantEmail: string): string {
    const payload = { referentEmail, doctorantEmail };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "100y" });

    console.log("🚀 Token JWT généré :", token);
    console.log("🔑 Payload utilisé :", payload);

    return token;
}

export function verifyToken(token: string): any {
    console.log("🔍 Token reçu pour validation :", token);
    console.log("🔑 SECRET_KEY utilisé :", SECRET_KEY);

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("✅ Token JWT décodé :", decoded);
        return decoded;
    } catch (error) {
        console.error("❌ Erreur de vérification du JWT :", error.message);
        return null;
    }
}

export async function verifyTokenAndFindDoctorant(token: string, doctorantService: DoctorantService) {
    console.log("🔍 Token reçu pour validation :", token);
    console.log("🔑 SECRET_KEY utilisé :", SECRET_KEY);

    try {
        const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;
        console.log("✅ Token JWT décodé :", decoded);

        const doctorantEmail = decoded.doctorantEmail || decoded.email;  // Ajoute une vérification au cas où
        if (!doctorantEmail) {
            console.error("❌ ERREUR : Aucun doctorantEmail trouvé dans le token !");
            return null;
        }

        console.log(`[DEBUG] Recherche du doctorant avec email : ${doctorantEmail}`);
        const doctorant = await doctorantService.findDoctorantByTokenEmail(doctorantEmail);

        return doctorant;
    } catch (error) {
        console.error("❌ Erreur de vérification du JWT :", error.message);
        return null;
    }
}

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

export async function generateToken(email: string, doctorantService: DoctorantService, emailDoctorant: string): Promise<string> {
    console.log(`🔍 Génération du token pour l'email : ${email}`);

    // Recherche du doctorant à partir de n'importe quel email (principal ou représentant)
    const doctorant = await doctorantService.findDoctorantByAnyEmail(emailDoctorant);
    console.log(`[DEBUG] Doctorant trouvé :`, doctorant);

    if (!doctorant) {
        console.error(`❌ Aucun doctorant trouvé pour l'email : ${email}`);
        throw new Error(`Doctorant introuvable pour l'email : ${email}`);
    }

    // Stocke l'email principal du doctorant dans le token
    const doctorantEmail = doctorant.email;
    console.log(`✅ Email du doctorant associé : ${doctorantEmail}`);

    // Génération du token JWT avec l'email du doctorant
    const payload = { doctorantEmail };
    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "100y" });

    console.log(`🚀 Token JWT généré : ${token}`);
    return token;
}

export const sendMail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject,
        html,
        attachments,
    };

    try {
        console.log(`[EMAIL] Préparation de l'envoi à ${to}...`);
        console.log('[EMAIL] Paramètres du mail :', mailOptions);

        console.log('[EMAIL] Vérification de la connexion SMTP...');
        await transporter.verify();
        console.log('[EMAIL] Connexion SMTP réussie.');

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Email envoyé à ${to}. ID Message: ${info.messageId}`);
        console.log(`[EMAIL] Réponse SMTP complète:`, info);

        return info;
    } catch (error) {
        console.error(`[EMAIL] Erreur lors de l'envoi de l'email à ${to}:`, error);
        throw error;
    }
};

export const sendMailDynamic = async (to: string[] = [], subject: string, html: string, attachments?: any[], cc: string[] = []) => {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        cc: cc.length > 0 ? cc.join(',') : undefined, // Ajoute les CC si existants
        subject,
        html,
        attachments,
    };

    try {
        console.log(`[EMAIL] Préparation de l'envoi à ${to}...`);
        console.log('[EMAIL] Paramètres du mail :', mailOptions);

        console.log('[EMAIL] Vérification de la connexion SMTP...');
        await transporter.verify();
        console.log('[EMAIL] Connexion SMTP réussie.');

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Email envoyé à ${to}. ID Message: ${info.messageId}`);
        console.log(`[EMAIL] Réponse SMTP complète:`, info);

        return info;
    } catch (error) {
        console.error(`[EMAIL] Erreur lors de l'envoi de l'email à ${to}:`, error);
        throw error;
    }
};

export const sendMailWithCC = async (to: string, subject: string, html: string, attachments?: any[], cc?: string) => {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        cc, // Ajout du CC ici
        subject,
        html,
        attachments,
    };

    try {
        console.log(`[EMAIL] Préparation de l'envoi à ${to} (CC: ${cc})...`);
        console.log('[EMAIL] Paramètres du mail :', mailOptions);

        console.log('[EMAIL] Vérification de la connexion SMTP...');
        await transporter.verify();
        console.log('[EMAIL] Connexion SMTP réussie.');

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Email envoyé à ${to} (CC: ${cc}). ID Message: ${info.messageId}`);
        console.log(`[EMAIL] Réponse SMTP complète:`, info);

        return info;
    } catch (error) {
        console.error(`[EMAIL] Erreur lors de l'envoi de l'email à ${to} (CC: ${cc}):`, error);
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

// comment pour pas que ca envoi un mail a chaque lancement du serveur
// sendTestEmail();