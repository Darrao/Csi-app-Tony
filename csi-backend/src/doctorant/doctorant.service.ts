import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctorant } from './schemas/doctorant.schema';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as csvParser from 'csv-parser';
import { ObjectId } from 'mongodb';


@Injectable()
export class DoctorantService {
    constructor(@InjectModel(Doctorant.name) private doctorantModel: Model<Doctorant>) {}

    async findDoctorantByAnyEmail(email: string): Promise<Doctorant | null> {
        return this.doctorantModel.findOne({
            $or: [
                { email: email },
                { emailMembre1: email },
                { emailMembre2: email },
                { emailAdditionalMembre: email }
            ]
        }).exec();
    }

    async addFiles(id: string, fichiers: { nomOriginal: string; cheminStockage: string }[]) {
        const doctorant = await this.doctorantModel.findById(id);
        if (!doctorant) throw new NotFoundException("Doctorant non trouvé.");
    
        if (!Array.isArray(doctorant.fichiersExternes)) {
            doctorant.fichiersExternes = []; // 🔥 Corrige si le champ est undefined
        }
    
        doctorant.fichiersExternes.push(...fichiers);
        await doctorant.save();
        return doctorant;
    }

    async getDoctorant(id: string) {
        return this.doctorantModel.findById(id);
    }

    async deleteAll() {
        console.log("🔥 Suppression de tous les doctorants...");
        return await this.doctorantModel.deleteMany({}); // 🔥 Supprime tous les doctorants
    }

    async create(createDoctorantDto: CreateDoctorantDto): Promise<Doctorant> {
        const normalizedEmail = createDoctorantDto.email.trim().toLowerCase();
        const createdDoctorant = new this.doctorantModel({
            ...createDoctorantDto,
            email: normalizedEmail,
        });
        return await createdDoctorant.save();
    }

    async findAll(): Promise<Doctorant[]> {
        const doctorants = await this.doctorantModel.find().exec();
        console.log('[SERVICE] 📌 Doctorants récupérés par findAll():', doctorants);
        return doctorants;
    }

    async delete(id: string): Promise<{ message: string }> {
        const deleted = await this.doctorantModel.findByIdAndDelete(id).exec();
        if (!deleted) throw new NotFoundException(`Doctorant avec ID ${id} introuvable`);
        return { message: 'Doctorant supprimé avec succès' };
    }

    async update(id: string, updateDoctorantDto: CreateDoctorantDto): Promise<Doctorant> {
        try {
            console.log("🔄 Mise à jour du doctorant :", id);
            const updatedDoctorant = await this.doctorantModel.findByIdAndUpdate(id, updateDoctorantDto, { new: true });
    
            if (!updatedDoctorant) {
                throw new NotFoundException(`❌ Doctorant avec l'ID ${id} introuvable.`);
            }
    
            return updatedDoctorant;
        } catch (error) {
            console.error("❌ Erreur lors de la mise à jour :", error);
            throw new InternalServerErrorException(error.message);
        }
    }

    async findOne(idOrEmail: string): Promise<Doctorant | null> {
        if (idOrEmail.match(/^[0-9a-fA-F]{24}$/)) {
            return this.doctorantModel.findById(idOrEmail).exec();
        } else {
            return this.doctorantModel.findOne({ email: idOrEmail.toLowerCase().trim() }).exec();
        }
    }

    async findByEmail(email: string): Promise<Doctorant | null> {
        if (!email) {
            console.error("⚠️ ERREUR : L'email fourni est undefined !");
            return null;
        }
        return this.doctorantModel.findOne({ email: email.trim().toLowerCase() }).exec();
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

        const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    
        // Vérifiez si le doctorant existe
        const existingDoctorant = await this.doctorantModel.findById(id).exec();
        if (!existingDoctorant) {
            throw new Error('Doctorant introuvable');
        }

        // j'ai modifié avec ces deux lignes
        const updatedDoctorant = await this.doctorantModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        return updatedDoctorant;
    }

    async updateDoctorantByEmail(email: string, updateData: any): Promise<Doctorant> {
        return this.doctorantModel.findOneAndUpdate({ email }, updateData, { new: true }).exec();
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
                
                /*
                // 🔍 Affichage détaillé des données pour vérifier leur structure
                console.log(`[SERVICE] 📌 Données actuelles du doctorant ${doctorant.nom} :`, JSON.stringify(doctorant.representantData, null, 2));
    
                console.log(`[SERVICE] 🔍 Valeurs des champs saisieChamp1 et saisieChamp2 pour ${doctorant.nom}:`, {
                    saisieChamp1: doctorant.representantData?.saisieChamp1,
                    saisieChamp2: doctorant.representantData?.saisieChamp2
                });
    
                // ✅ Vérification correcte des champs
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
                */
    
                return doctorant;
            })
        );
    
        console.log('[SERVICE] ✅ Fin de checkAndUpdateAllStatuses.');
        return updatedDoctorants;
    }

    async findDoctorantByTokenEmail(doctorantEmail: string): Promise<Doctorant | null> {
        if (!doctorantEmail) {
            console.error("⚠️ ERREUR : L'email fourni est undefined !");
            return null;
        }
    
        const cleanedEmail = doctorantEmail.trim().replace(/\u200B/g, '');
        console.log(`[DEBUG] 🔍 Recherche du doctorant avec email (nettoyé) : '${cleanedEmail}'`);
    
        const doctorant = await this.doctorantModel.findOne({
            email: { $regex: `^${cleanedEmail}$`, $options: 'i' }  // ✅ insensible à la casse
        }).exec();
    
        if (!doctorant) {
            console.log(`❌ Aucun doctorant trouvé pour '${cleanedEmail}'`);
        } else {
            console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom} (${doctorant.email})`);
        }
    
        return doctorant;
    }

    private safeParseDate(input: string): Date | undefined {
        if (!input) return undefined;
        const cleaned = input.trim().replace(/\r|\n/g, '');
        const parsed = new Date(cleaned);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }

    async importDoctorantsFromCSV(csvData: string): Promise<any> {
        const rows = [];
        const cleanKey = (key: string) => key.replace(/^\ufeff/, '').trim();
        const currentYear = new Date().getFullYear(); // 🔥 Obtenir l'année actuelle
    
        return new Promise((resolve, reject) => {
            const readableStream = require('stream').Readable.from(csvData);
    
            readableStream
                .pipe(csvParser({ separator: ';' }))
                .on('data', (row) => {
                    const cleanedRow = {};
                    for (let key in row) {
                        cleanedRow[cleanKey(key)] = row[key];
                    }
                    rows.push(cleanedRow);
                    console.log(`🔍 [DEBUG] Ligne CSV nettoyée :`, cleanedRow);
                })
                .on('end', async () => {
                    const insertedDoctorants = [];
    
                    for (const row of rows) {
                        console.log(`🔍 [DEBUG] Clés détectées :`, Object.keys(row));
    
                        const email = row[cleanKey("Email d'envoi")]?.trim() || '';
                        if (!email) {
                            console.warn(`⚠️ Email manquant, ligne ignorée.`);
                            continue;
                        }
    
                        const existingDoctorant = await this.doctorantModel.findOne({ email }).exec();
                        if (existingDoctorant) {
                            console.log(`⚠️ Doctorant avec email ${email} existe déjà, ignoré.`);
                            continue;
                        }
    
                        let prenom = row[cleanKey('Prénom')]?.trim() || '';
                        console.log(`🔍 [DEBUG] Prénom après nettoyage pour ${email} : '${prenom}'`);
    
                        if (!prenom) {
                            console.warn(`⚠️ Prénom manquant pour ${email}, vérifie ton CSV.`);
                        }
                        
    
                        // Création de l'objet Doctorant avec importDate
                        const newDoctorant = new this.doctorantModel({
                            prenom,
                            nom: row[cleanKey('Nom')]?.trim() || '',
                            email,
                            ID_DOCTORANT: row[cleanKey('ID_DOCTORANT')]?.trim() || '',
                            departementDoctorant: row[cleanKey('DEPARTEMENT_DOCTORANT DIRECT::Nom Département')] || '',
                            datePremiereInscription: this.safeParseDate(row[cleanKey('Date 1ère Inscription')]),
                            anneeThese: row[cleanKey('AnnéeThèse')] || '',
                            titreThese: row[cleanKey("Sujet Thèse à l'inscription")] || '',
                            intituleUR: row[cleanKey('UnitésRecherche::Intitulé Unité Recherche')] || '',
                            directeurUR: row[cleanKey('UnitésRecherche::Nom_Prenom_DU')] || '',
                            intituleEquipe: row[cleanKey('Equipes::Nom Equipe Affichée')] || '',
                            directeurEquipe: row[cleanKey('Equipes::Nom_Prenom_Responsable')] || '',
                            nomPrenomHDR: row[cleanKey('HDR::Nom_Prenom_HDR')] || '',
                            email_HDR: row[cleanKey('HDR::Email_HDR')] || '',
                            importDate: currentYear, // 🆕 Ajout de l'année d'importation
                        });
    
                        console.log(`📝 [DEBUG] Objet Doctorant avant insertion:`, newDoctorant);
                        await newDoctorant.save();
                        insertedDoctorants.push(newDoctorant);
                    }
    
                    console.log(`✅ Importation terminée : ${insertedDoctorants.length} doctorants ajoutés.`);
                    resolve(insertedDoctorants);
                })
                .on('error', (error) => {
                    console.error('❌ Erreur lors du parsing CSV :', error);
                    reject(error);
                });
        });
    }
    
    async findByReferentEmail(email: string) {
        return this.doctorantModel.findOne({
            $or: [
                { emailMembre1: email },
                { emailMembre2: email },
                { emailAdditionalMembre: email }
            ]
        });
    }


    async generateNewPDF(doctorant: Doctorant): Promise<Buffer> {
        console.log("🔍 Génération du PDF pour :", doctorant.nom, doctorant.prenom);
    
        // 📄 Création du PDF
        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage([600, 800]);
    
        // 🔥 Importation des polices standard
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
        let y = 770; // 📌 Position initiale
        const marginLeft = 50;
        const marginRight = 550;
        const marginBottom = 50;
        const maxWidth = marginRight - marginLeft; // Largeur maximale pour le texte
    
        // Fonction pour nettoyer les textes
        const cleanText = (text: string | null): string => {
            if (!text) return "N/A";
            return text
                .normalize("NFD") // Supprime les accents
                .replace(/[\u0300-\u036f]/g, "") // Diacritiques
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // 🚨 Supprime les caractères de contrôle (comme \v)
                .replace(/\t/g, "    ") // Tabulation → espaces
                .replace(/\r?\n|\r/g, " ") // Sauts de ligne → espace
                .replace(/[^\x00-\x7F]/g, char => {
                    const replacements: Record<string, string> = {
                        "±": "+/-",
                        "•": "-",
                        "×": "x",
                        "→": "->",
                        "“": "\"",
                        "”": "\"",
                        "‘": "'",
                        "’": "'"
                    };
                    return replacements[char] || "?";
                })
                .trim();
        };
    
        // Ajout de texte avec mise en page
        const addWrappedText = (label: string, value: string | null) => {
            if (y <= marginBottom) newPage();
            if (!value) return;
    
            const cleanedValue = cleanText(value).replace(/\n/g, ' '); 
            const labelWidth = boldFont.widthOfTextAtSize(label, 10);
            const text = cleanedValue;
    
            const lines = [];
            let words = text.split(" ");
            let line = "";
    
            for (let word of words) {
                let testLine = line + (line.length ? " " : "") + word;
                let textWidth = font.widthOfTextAtSize(testLine, 10);
    
                if (textWidth < maxWidth - labelWidth - 10) {
                    line = testLine;
                } else {
                    lines.push(line);
                    line = word;
                }
            }
            if (line) lines.push(line);
    
            // Affichage du label en gras
            page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont });
    
            lines.forEach((line, index) => {
                const xPosition = index === 0 ? marginLeft + labelWidth + 10 : marginLeft;
                if (y <= marginBottom) newPage();
                page.drawText(line, { x: xPosition, y, size: 10, font });
                y -= 10; // 🔥 Espacement augmenté
            });
    
            y -= 5; // 🔥 Ajoute un espace entre chaque champ
        };

        const addWrappedText3 = (label: string, value1: string | null, value2: string | null) => {
            if (y <= marginBottom) newPage();
            if (!value1 && !value2) return;
        
            const cleanedValue1 = cleanText(value1) || "N/A";
            const cleanedValue2 = cleanText(value2) || "N/A";
        
            const fullText = `${cleanedValue1} - ${cleanedValue2}`; // Fusionne les deux valeurs
            const labelWidth = boldFont.widthOfTextAtSize(label, 10) + 5; // 🛠️ Ajuste l'espace après le label
            const textWidth = font.widthOfTextAtSize(fullText, 10);
            
            // Si le texte complet dépasse la largeur max, il est divisé en lignes
            const words = fullText.split(" ");
            let line = "";
            const lines: string[] = [];
        
            for (const word of words) {
                const testLine = line.length ? line + " " + word : word;
                const testWidth = font.widthOfTextAtSize(testLine, 10);
        
                if (testWidth < maxWidth - labelWidth - 10) {
                    line = testLine;
                } else {
                    lines.push(line);
                    line = word;
                }
            }
            if (line) lines.push(line);
        
            // 📌 Affichage du label en gras
            page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont });
        
            // 📌 Affichage du texte aligné avec les autres valeurs
            lines.forEach((line, index) => {
                const xPosition = index === 0 ? marginLeft + labelWidth : marginLeft;
                if (y <= marginBottom) newPage();
                page.drawText(line, { x: xPosition, y, size: 10, font });
                y -= 10; // Espacement entre les lignes
            });
        
            y -= 5; // Espace supplémentaire après le champ
        };


        const addTitleWidthVar = (label: string, value: string | null) => {
            if (y <= marginBottom) newPage();
            if (!value) return;
        
            const cleanedValue = cleanText(value).replace(/\n/g, ' ');
            const fullText = `${label} ${cleanedValue}`; // Fusionne le label et la valeur
        
            const words = fullText.split(" ");
            let line = "";
            const lines: string[] = [];
        
            for (const word of words) {
                const testLine = line.length ? line + " " + word : word;
                const textWidth = boldFont.widthOfTextAtSize(testLine, 14);
        
                if (textWidth < maxWidth) {
                    line = testLine;
                } else {
                    lines.push(line);
                    line = word;
                }
            }
            if (line) lines.push(line);
        
            // Affiche chaque ligne du titre centré
            for (const l of lines) {
                if (y <= marginBottom) newPage();
        
                const textWidth = boldFont.widthOfTextAtSize(l, 14);
                const centeredX = (600 - textWidth) / 2; // Centrage basé sur la largeur de la page
        
                page.drawText(l, { x: centeredX, y, size: 14, font: boldFont });
                y -= 20; // Espacement entre les lignes
            }
        
            y -= 10; // Espace supplémentaire après le titre
        };
  

        const addTitle = (title: string) => {

                y -= 20; // Ajoute un espace au-dessus du titre
    
                if (y <= marginBottom) newPage();
                const cleanedTitle = cleanText(title);
                const words = cleanedTitle.split(" ");
                let line = "";
                const lines: string[] = [];
              
                for (const word of words) {
                  const testLine = line.length ? line + " " + word : word;
                  const textWidth = boldFont.widthOfTextAtSize(testLine, 12);
                  if (textWidth < maxWidth) {
                    line = testLine;
                  } else {
                    lines.push(line);
                    line = word;
                  }
                }
                if (line) lines.push(line);
              
                // Affiche chaque ligne du titre
                for (const l of lines) {
                  if (y <= marginBottom) newPage();
                  page.drawText(l, { x: marginLeft, y, size: 12, font: boldFont });
                  y -= 20; // Espacement entre les lignes du titre
                }
                
                y -= 5; // Espace supplémentaire après le titre
              };
        
        // Ajout des titres de section
        const addSectionTitle = (title: string) => {

            y -= 20; // Ajoute un espace au-dessus du titre

            if (y <= marginBottom) newPage();
            const cleanedTitle = cleanText(title);
            const words = cleanedTitle.split(" ");
            let line = "";
            const lines: string[] = [];
          
            for (const word of words) {
              const testLine = line.length ? line + " " + word : word;
              const textWidth = boldFont.widthOfTextAtSize(testLine, 14);
              if (textWidth < maxWidth) {
                line = testLine;
              } else {
                lines.push(line);
                line = word;
              }
            }
            if (line) lines.push(line);
          
            // Affiche chaque ligne du titre
            for (const l of lines) {
              if (y <= marginBottom) newPage();
              page.drawText(l, { x: marginLeft, y, size: 14, font: boldFont });
              y -= 20; // Espacement entre les lignes du titre
            }
            
            y -= 5; // Espace supplémentaire après le titre
          };

        const addWrappedTextContent = (value: string | null) => {
            if (y <= marginBottom) newPage();
            if (!value) return;
        
            const cleanedValue = cleanText(value) || "N/A";
            const words = cleanedValue.split(" ");
            let line = "";
            const lines: string[] = [];
        
            for (const word of words) {
                const testLine = line.length ? line + " " + word : word;
                const textWidth = font.widthOfTextAtSize(testLine, 10);
        
                if (textWidth < maxWidth) {
                    line = testLine;
                } else {
                    lines.push(line);
                    line = word;
                }
            }
            if (line) lines.push(line);
        
            // Affichage du texte wrap
            lines.forEach((line) => {
                if (y <= marginBottom) newPage();
                page.drawText(line, { x: marginLeft, y, size: 10, font });
                y -= 10; // Espacement entre les lignes
            });
        
            y -= 5; // Espace supplémentaire après le champ
        };
    
        // Fonction pour gérer le saut de page
        const newPage = () => {
            page = pdfDoc.addPage([600, 800]);
            y = 770;
        };
    
        // 🎨 Titre principal
        addTitleWidthVar("Rapport Annuel - CSI Year ", doctorant.anneeThese );
    
        // 📝 Informations personnelles
        addSectionTitle("Informations personnelles");
        addWrappedText("First Name :", doctorant.prenom);
        addWrappedText("Family Name :", doctorant.nom);
        addWrappedText("Email :", doctorant.email);
        addWrappedText("Date first registration :", doctorant.datePremiereInscription?.toISOString().split('T')[0]);
        addWrappedText("Unique ID :", doctorant.ID_DOCTORANT);
        addWrappedText("Doctoral student's department :", doctorant.departementDoctorant);
    
        // 📝 Thesis information & supervision
        addSectionTitle("Thesis information & supervision");
        addWrappedText("Thesis Title :", doctorant.titreThese);
        addWrappedText("Funding :", doctorant.typeFinancement);
    
        // 🏫 Research Unit
        // addSectionTitle("Research Unit");
        addWrappedText("Research unit :", doctorant.intituleUR);
        addWrappedText("Director of the research unit :", doctorant.directeurUR);
    
        // 👥 Team
        // addSectionTitle("Team");
        addWrappedText("Team :", doctorant.intituleEquipe);
        addWrappedText("Team leader :", doctorant.directeurEquipe);
        addWrappedText3("Thesis supervisor :", doctorant.nomPrenomHDR, doctorant.email_HDR );
        // addWrappedText("Thesis supervisor email :", doctorant.email_HDR);
        addWrappedText("Thesis co-supervisor (optional) :", doctorant.coDirecteurThese);
    
        // 🏛 Member of the CSI committee
        addSectionTitle("Member of the CSI committee");
        addWrappedText3("Member #1 :", doctorant.nomMembre1, doctorant.emailMembre1);
        // addWrappedText("Email :", doctorant.emailMembre1);
        addWrappedText3("Member #2 :", doctorant.nomMembre2, doctorant.emailMembre2);
        // addWrappedText("Email :", doctorant.emailMembre2);
        addWrappedText3("Additional member :", doctorant.nomAdditionalMembre, doctorant.emailAdditionalMembre);
        // addWrappedText("Email :", doctorant.emailAdditionalMembre);
    
        // 📖 Scientific activities
        addSectionTitle("Scientific activities");
        addWrappedText("Missions :", doctorant.missions);
        addWrappedText("Publications :", doctorant.publications);
        addWrappedText("Conferences :", doctorant.conferencePapers);
        addWrappedText("Posters :", doctorant.posters);
        addWrappedText("Public communications :", doctorant.publicCommunication);
    
        // 📌 Training modules
        addSectionTitle("Training modules");
        addWrappedText("Scientific modules (cumulated hours) :", `${doctorant.nbHoursScientificModules || 0}h`);
        addWrappedText("Cross-disciplinary modules (cumulated hours) :", `${doctorant.nbHoursCrossDisciplinaryModules || 0}h`);
        addWrappedText("Professional integration and career development modules (cumulated hours) :", `${doctorant.nbHoursProfessionalIntegrationModules || 0}h`);
        addWrappedText("Total number of hours (all modules) :", `${doctorant.totalNbHours || 0}h`);
        addWrappedText("Additional information :", doctorant.additionalInformation);
    
        y -= 20;
    
        // 🔥 Ajout des fichiers PDF supplémentaires
        if (doctorant.fichiersExternes && doctorant.fichiersExternes.length > 0) {
            console.log(`📂 Ajout des fichiers externes (${doctorant.fichiersExternes.length} fichiers)`);

            // ✅ Vérifier si suffisamment d’espace avant d’ajouter le texte
            if (y - 50 <= marginBottom) newPage();
            
            // 📝 Ajout du titre "Annual Scientific Report" à gauche
            y -= 30; // Ajoute un grand espace avant
            page.drawText("Annual Scientific Report", { 
                x: marginLeft, 
                y, 
                size: 14, 
                font: boldFont 
            });

            y -= 20; // Espacement après le titre

            // 📄 Ajout du texte "Please see on next pages" à gauche
            page.drawText("Please see on next pages", { 
                x: marginLeft, 
                y, 
                size: 12, 
                font 
            });

            y -= 40; // Gros espace avant d’ajouter les fichiers externes

            // ✅ Ajout des fichiers externes après cette section
            for (const fichier of doctorant.fichiersExternes) {
                const filePath = path.join(__dirname, '../../', fichier.cheminStockage);

                if (!fs.existsSync(filePath)) {
                    console.warn(`⚠️ Fichier introuvable : ${filePath}`);
                    continue;
                }

                if (!filePath.endsWith('.pdf')) {
                    console.warn(`🚫 Fichier ignoré (non PDF) : ${filePath}`);
                    continue;
                }

                try {
                    const fileBytes = fs.readFileSync(filePath);
                    const embeddedPdf = await PDFDocument.load(fileBytes);
                    const copiedPages = await pdfDoc.copyPages(embeddedPdf, embeddedPdf.getPageIndices());

                    copiedPages.forEach((copiedPage) => pdfDoc.addPage(copiedPage));
                    console.log(`✅ Fichier ajouté: ${fichier.nomOriginal}`);
                } catch (error) {
                    console.error(`❌ Erreur lors de l'ajout du fichier ${filePath} :`, error);
                }
            }

            // ✅ IMPORTANT : Remettre y à 770 après l'ajout des fichiers externes
            newPage();
        }



        // 📌 Vérification des réponses du CSI
        const csiResponses: Record<string, string> = {};
        let hasCsiResponses = false;
        let hasValidCSIResponses = false; // Vérifie si au moins une réponse CSI est valide
        let hasValidConclusion = false; // Vérifie si la conclusion contient des données valides

        const questions = [
            "Has the research question been clearly and adequately defined?",
            "Does the doctoral student have a comprehensive understanding of the research process and the tasks to be completed prior to the defense?",
            "Is the research progressing as expected? If not, would an extension of the thesis preparation period allow for a successful defense?",
            "Have all the scientific, material, and financial requirements necessary for the doctoral project been fulfilled?",
            "If the doctoral student is preparing his/her thesis within a collaborative framework, are the conditions satisfactory?",
            "How effectively are the thesis director or co-directors managing the supervision?",
            "Is the communication between the doctoral students and supervisors satisfactory?",
            "Is the doctoral student well-integrated into the research team or unit? Does he/she feel isolated?",
            "How motivated and determined is the doctoral student to progress with his/her work?",
            "Are there any signs of demotivation or discouragement?",
            "Is the doctoral student at risk of psychosocial stress?",
            "Written output (progress report, bibliography review, article, conference abstract)?",
            "Has the doctoral student been educated on research ethics and scientific integrity?",
            "Are the doctoral student’s presentation skills up to par?",
            "Does the doctoral student have opportunities to broaden his/her scientific culture?",
            "How is the training portfolio progressing?",
            "How is the preparation for the doctoral student’s future career progressing?"
        ];

        for (let i = 1; i <= 17; i++) {
            const question = `Q${i}`;
            const comment = `Q${i}_comment`;

            const questionValue = doctorant[question] ? doctorant[question].toString().trim() : "N/A";
            const commentValue = doctorant[comment] ? doctorant[comment].toString().trim() : "N/A";

            if (questionValue !== "N/A" || commentValue !== "N/A") {
                csiResponses[question] = questionValue;
                csiResponses[comment] = commentValue;
                hasCsiResponses = true;
                hasValidCSIResponses = true; // On a au moins une vraie réponse CSI
            }
        }

        // Vérification de la conclusion et recommandations
        if (doctorant.conclusion?.trim() && doctorant.conclusion !== "N/A") hasValidConclusion = true;
        if (doctorant.recommendation?.trim() && doctorant.recommendation !== "N/A") hasValidConclusion = true;
        if (doctorant.recommendation_comment?.trim() && doctorant.recommendation_comment !== "N/A") hasValidConclusion = true;

        // 📌 Ajout des réponses du CSI uniquement si nécessaire
        if (hasValidCSIResponses) {
            y -= 20;
            addSectionTitle("Evaluation by CSI Members");

            for (let i = 1; i <= 17; i++) {
                const question = `Q${i}`;
                const comment = `Q${i}_comment`;

                const questionValue = doctorant[question] ? doctorant[question].toString().trim() : "N/A";
                const commentValue = doctorant[comment] ? doctorant[comment].toString().trim() : "N/A";

                if (questionValue !== "N/A" || commentValue !== "N/A") {
                    if (y - 70 <= marginBottom) newPage();
                    // addSectionTitle(`Question ${i}`);
                    addTitle(questions[i - 1]);

                    if (y - 40 <= marginBottom) newPage();
                    addWrappedText("Evaluation :", questionValue);

                    if (y - 40 <= marginBottom) newPage();
                    addWrappedTextContent(commentValue);
                }
            }
        }

        const recommendationLabels: Record<string, string> = {
            "approve": "The committee approves the re-registration",
            "disapprove": "The committee disapproves of the re-registration",
            "exemption": "The committee supports the request for an exemption for an additional registration",
            "unfavourable": "The committee issues an unfavourable opinion on the request for a derogation for additional registration",
            "new_meeting": "The committee advises scheduling a new meeting with the CSI"
        };

        // 📌 Ajout de la conclusion uniquement si elle contient des données
        if (hasValidConclusion) {
            addSectionTitle("Conclusion and recommendations");
            addWrappedText("Conclusion :", doctorant.conclusion);

            // 🛠️ Transformation de la recommandation en texte lisible
            const readableRecommendation = doctorant.recommendation
                ? recommendationLabels[doctorant.recommendation] || doctorant.recommendation
                : "N/A";

            addWrappedText("Recommendation :", readableRecommendation);
            addWrappedText("Comment on the recommandation :", doctorant.recommendation_comment);
        }    

        
        // 📌 Génération des bytes du PDF
        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        // 📂 Définir le chemin du rapport PDF
        const uploadDir = path.join(__dirname, '../../uploads/doctorants', doctorant.ID_DOCTORANT, 'rapport');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 📄 Nom et chemin du fichier
        const fileName = `Rapport_${doctorant.nom}_${doctorant.prenom}_${doctorant._id}.pdf`;  
        const filePath = path.join(uploadDir, fileName);

        // 💾 Sauvegarde du fichier sur le serveur
        fs.writeFileSync(filePath, pdfBuffer);
        console.log(`✅ Rapport PDF sauvegardé à : ${filePath}`);

        // 🔄 Mise à jour de la base de données avec le chemin du rapport
        await this.doctorantModel.findByIdAndUpdate(doctorant._id, {
            rapport: {
                nomOriginal: fileName,
                cheminStockage: `uploads/doctorants/${doctorant.ID_DOCTORANT}/rapport/${fileName}`,
            }
        }, { new: true });

        console.log(`🔍 Contenu du PDF :`, cleanText(JSON.stringify(doctorant, null, 2)));
        return pdfBuffer;
    }
}