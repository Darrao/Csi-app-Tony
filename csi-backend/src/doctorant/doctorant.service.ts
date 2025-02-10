import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctorant } from './schemas/doctorant.schema';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class DoctorantService {
    constructor(@InjectModel(Doctorant.name) private doctorantModel: Model<Doctorant>) {}

    async create(createDoctorantDto: any): Promise<Doctorant> {
        const { email, representantEmail1, representantEmail2, ...otherData } = createDoctorantDto;
    
        // Vérification des emails des représentants
        if (!representantEmail1 || !representantEmail2) {
            throw new Error('Les emails des représentants sont requis.');
        }
    
        const normalizedEmail = email.trim().toLowerCase();
    
        const createdDoctorant = new this.doctorantModel({
            ...otherData,
            email: normalizedEmail,
            representantData: {
                representantEmail1,
                representantEmail2,
            },
        });
    
        return createdDoctorant.save();
    }

    async findAll(): Promise<Doctorant[]> {
        const doctorants = await this.doctorantModel.find().exec();
        console.log('[SERVICE] 📌 Doctorants récupérés par findAll():', doctorants);
        return doctorants;
    }

    async delete(id: string): Promise<{ deleted: boolean; message?: string }> {
        try {
            await this.doctorantModel.findByIdAndDelete(id);
            return { deleted: true };
        } catch (error) {
            return { deleted: false, message: error.message };
        }
    }

    async update(id: string, updateDoctorantDto: CreateDoctorantDto): Promise<Doctorant> {
        return this.doctorantModel.findByIdAndUpdate(id, updateDoctorantDto, { new: true });
    }

    async findOne(idOrEmail: string): Promise<Doctorant | null> {
        if (idOrEmail.match(/^[0-9a-fA-F]{24}$/)) {
            // Si l'entrée est un ObjectId
            return this.doctorantModel.findById(idOrEmail).exec();
        } else {
            // Sinon, on suppose que c'est un email
            return this.doctorantModel.findOne({ email: idOrEmail }).exec();
        }
    }

    async findByEmail(email: string): Promise<Doctorant | null> {
        const normalizedEmail = email.trim().toLowerCase(); // Normalisation ici
        console.log('Recherche doctorant par email (normalisé) :', normalizedEmail);
        return this.doctorantModel.findOne({ email: normalizedEmail }).exec();
    }

    async saveDoctorant(data: any): Promise<Doctorant> {
        const existingDoctorant = await this.doctorantModel.findOne({ email: data.email });
        if (existingDoctorant) {
            throw new Error(`Le doctorant avec l'email ${data.email} existe déjà.`);
        }
        return this.doctorantModel.create(data);
    }

    async updateDoctorant(id: string, updateData: any): Promise<Doctorant> {
        console.log(`Mise à jour du doctorant avec ID : ${id}`);
        console.log('Données de mise à jour reçues :', updateData);
    
        // Vérifiez si le doctorant existe
        const existingDoctorant = await this.doctorantModel.findById(id).exec();
        if (!existingDoctorant) {
            throw new Error('Doctorant introuvable');
        }
    
        // Fusionnez les données des représentants
        const updatedRepresentantData = {
            ...existingDoctorant.representantData, // Préserve les données existantes
            ...updateData.representantData, // Ajoute ou met à jour les nouvelles données
        };
    
        // Vérifiez si tous les choix des représentants sont remplis
        const statut =
            updatedRepresentantData.representant1Choices?.choix1 &&
            updatedRepresentantData.representant1Choices?.choix2 &&
            updatedRepresentantData.representant2Choices?.choix1 &&
            updatedRepresentantData.representant2Choices?.choix2
                ? 'complet'
                : 'en attente';
    
        // Effectuez la mise à jour
        const result = await this.doctorantModel.findByIdAndUpdate(
            id,
            {
                $set: {
                    ...updateData, // Met à jour les autres champs (comme nom, email, etc.)
                    representantData: updatedRepresentantData, // Met à jour les données des représentants
                    statut, // Met à jour le statut basé sur la logique ci-dessus
                },
            },
            { new: true } // Retourne le document mis à jour
        ).exec();
    
        console.log('Résultat de la mise à jour :', result);
        return result;
    }
    
    async checkAndUpdateAllStatuses(): Promise<Doctorant[]> {
        console.log('[SERVICE] 📌 Début de checkAndUpdateAllStatuses...');
    
        // 🔥 Récupération de tous les doctorants
        const doctorants = await this.findAll();
    
        console.log('[SERVICE] ✅ Doctorants trouvés :', doctorants);
    
        if (doctorants.length === 0) {
            console.error('[SERVICE] ❌ Aucun doctorant trouvé.');
            return [];
        }
    
        // 🔄 Mise à jour des statuts pour chaque doctorant
        const updatedDoctorants: Doctorant[] = await Promise.all(
            doctorants.map(async (doctorant) => {
                console.log(`[SERVICE] 🧐 Vérification du doctorant : ${doctorant.nom} (${doctorant.email})`);
                
                // 🔍 Affichage détaillé des données pour vérifier leur structure
                console.log(`[SERVICE] 📌 Données actuelles du doctorant ${doctorant.nom} :`, JSON.stringify(doctorant.representantData, null, 2));
    
                console.log(`[SERVICE] 🔍 Valeurs des champs saisieChamp1 et saisieChamp2 pour ${doctorant.nom}:`, {
                    saisieChamp1: doctorant.representantData?.saisieChamp1,
                    saisieChamp2: doctorant.representantData?.saisieChamp2
                });
                // ✅ Vérification correcte des champs (on utilise `saisieChamp1` et `saisieChamp2`)
                const isComplete =
                    doctorant.representantData?.saisieChamp1 &&
                    doctorant.representantData?.saisieChamp2;
    
                console.log(`[SERVICE] 📌 Tous les champs remplis ? ${isComplete ? '✅ OUI' : '❌ NON'}`);
    
                const newStatus = isComplete ? 'complet' : 'en attente';
                console.log(`[SERVICE] 📌 Nouveau statut pour ${doctorant.nom} : ${newStatus}`);
    
                // 🔄 Mise à jour du statut si nécessaire
                if (doctorant.statut !== newStatus) {
                    console.log(`[SERVICE] 🔄 Mise à jour du statut pour ${doctorant.nom} : ${doctorant.statut} → ${newStatus}`);
    
                    // 🔥 Mise à jour dans MongoDB
                    const updatedDoctorant = await this.doctorantModel.findByIdAndUpdate(
                        doctorant._id,
                        { statut: newStatus },
                        { new: true, runValidators: true }
                    ).exec();

                    console.log(`[SERVICE] ✅ Mise à jour en base MongoDB pour ${doctorant.nom}:`, updatedDoctorant);
    
                    return updatedDoctorant as Doctorant;
                } else {
                    console.log(`[SERVICE] ✅ Aucun changement nécessaire pour ${doctorant.nom}.`);
                    return doctorant;
                }
            })
        );
    
        console.log('[SERVICE] ✅ Fin de checkAndUpdateAllStatuses.');
        return updatedDoctorants;
    }

    async generateFilledPDF(doctorant: Doctorant): Promise<Buffer> {
        // Charger le modèle PDF existant
        const pdfPath = path.join(__dirname, '../../templates/template.pdf'); // Mets ton vrai chemin
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
    
        // Définir une police pour le texte
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
        // Récupérer toutes les pages du document
        const pages = pdfDoc.getPages();
    
        pages.forEach((page, pageIndex) => {
            console.log(`[PDF] 🛠️ Ajout des données et de la grille sur la page ${pageIndex + 1}`);
    
            // Ajouter du texte aux champs correspondants (UNIQUEMENT SUR LA PREMIÈRE PAGE)
            if (pageIndex === 0) {
                page.drawText(doctorant.uniteRecherche || "N/A", { x: 200, y: 235, size: 12, font });
                page.drawText(doctorant.titreThese || "N/A", { x: 200, y: 222, size: 12, font });
                page.drawText(doctorant.prenom || "N/A", { x: 200, y: 210, size: 12, font });
                page.drawText(doctorant.nom || "N/A", { x: 200, y: 196, size: 12, font });
                page.drawText(doctorant.directeurThese || "N/A", { x: 200, y: 184, size: 12, font });
            }
    
            // 🔹 Débogage : Dessiner une grille ultra précise (traits tous les 10 pixels)
            for (let y = 800; y > 0; y -= 10) {
                const color = y % 50 === 0 ? rgb(1, 0, 0) : rgb(0.8, 0.8, 0.8); // Rouge tous les 50px, gris sinon
                if (y % 50 === 0) page.drawText(`${y}`, { x: 5, y, size: 8, font, color });
                page.drawLine({ start: { x: 30, y }, end: { x: 500, y }, thickness: 0.3, color });
            }
            for (let x = 50; x < 500; x += 10) {
                const color = x % 50 === 0 ? rgb(0, 0, 1) : rgb(0.8, 0.8, 0.8); // Bleu tous les 50px, gris sinon
                if (x % 50 === 0) page.drawText(`${x}`, { x, y: 820, size: 8, font, color });
                page.drawLine({ start: { x, y: 0 }, end: { x, y: 800 }, thickness: 0.3, color });
            }
        });
    
        // Générer le PDF modifié
        const modifiedPdfBytes = await pdfDoc.save();
        return Buffer.from(modifiedPdfBytes);
    }
}