import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctorant } from './schemas/doctorant.schema';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';
import { UpdateDoctorantDto } from './dto/update-doctorant.dto';
import { PDFDocument, StandardFonts, PDFPage, rgb } from 'pdf-lib';
import { Question } from '../question/schemas/question.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as csvParser from 'csv-parser';
import { ObjectId } from 'mongodb';
import 'dotenv/config';
import * as archiver from 'archiver';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';
import { FastifyReply } from 'fastify';
import { Workbook } from 'exceljs';

@Injectable()
export class DoctorantService {
  constructor(
    @InjectModel(Doctorant.name) private doctorantModel: Model<Doctorant>,
    @InjectModel(Question.name) private questionModel: Model<Question>,
  ) { }

  async findDoctorantByAnyEmail(email: string): Promise<Doctorant | null> {
    return this.doctorantModel
      .findOne({
        $or: [
          { email: email },
          { emailMembre1: email },
          { emailMembre2: email },
          { emailAdditionalMembre: email },
        ],
      })
      .exec();
  }

  async addFiles(
    id: string,
    fichiers: { nomOriginal: string; cheminStockage: string }[],
  ) {
    const doctorant = await this.doctorantModel.findById(id);
    if (!doctorant) throw new NotFoundException('Doctorant non trouvé.');

    if (!Array.isArray(doctorant.fichiersExternes)) {
      doctorant.fichiersExternes = []; // 🔥 Corrige si le champ est undefined
    }

    doctorant.fichiersExternes.push(...fichiers);
    await doctorant.save();
    return doctorant;
  }

  async generateAllReportsZip(filters: {
    searchTerm?: string;
    filterStatus?: string;
    filterYear?: string;
  }): Promise<Buffer> {
    let doctorants = await this.findAll();

    // 🔍 Applique les mêmes filtres côté backend
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      doctorants = doctorants.filter(
        (doc) =>
          doc.nom?.toLowerCase().includes(search) ||
          doc.ID_DOCTORANT?.toLowerCase().includes(search),
      );
    }

    if (filters.filterYear && filters.filterYear !== 'Tous') {
      doctorants = doctorants.filter(
        (doc) => Number(doc.importDate) === Number(filters.filterYear),
      );
    }

    if (filters.filterStatus && filters.filterStatus !== 'Tous') {
      doctorants = doctorants.filter((doc) => {
        switch (filters.filterStatus) {
          case 'Non envoyé au doctorant':
            return !doc.sendToDoctorant;
          case 'Envoyé au doctorant':
            return doc.sendToDoctorant;
          case 'Doctorant validé':
            return doc.doctorantValide;
          case 'Non validé par le doctorant':
            return !doc.doctorantValide;
          case 'Envoyé aux référents':
            return doc.sendToRepresentants;
          case 'Non envoyé aux référents':
            return !doc.sendToRepresentants;
          case 'Référents validés':
            return doc.representantValide;
          case 'Non validé par les référents':
            return !doc.representantValide;
          case 'Rapport final envoyé':
            return doc.finalSend;
          default:
            return true;
        }
      });
    }

    console.log(`✅ ${doctorants.length} doctorants filtrés pour export.`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    const outputBuffers: Buffer[] = [];

    archive.on('data', (data) => outputBuffers.push(data));

    for (const doctorant of doctorants) {
      if (!doctorant.rapport?.cheminStockage) continue;

      const filePath = path.join(
        __dirname,
        '../../',
        doctorant.rapport.cheminStockage,
      );
      if (!fs.existsSync(filePath)) continue;

      const fileStream = fs.createReadStream(filePath);
      const folderName = doctorant.ID_DOCTORANT || doctorant._id;
      const safeFolderName = folderName
        .toString()
        .replace(/[/\\?%*:|"<>]/g, '-');

      const archivePath = `doctorants/${safeFolderName}/rapport_${doctorant.nom}_${doctorant.prenom}.pdf`;

      archive.append(fileStream, { name: archivePath });
    }

    await archive.finalize();
    return Buffer.concat(outputBuffers);
  }

  async exportFilteredXLSX(
    res: FastifyReply,
    searchTerm?: string,
    filterStatus?: string,
    filterYear?: string,
  ) {
    const query: any = {};

    if (searchTerm) {
      const regex = new RegExp(searchTerm, 'i');
      query.$or = [
        { nom: { $regex: regex } },
        { ID_DOCTORANT: { $regex: regex } },
      ];
    }

    if (filterYear && filterYear !== 'Tous') {
      query.importDate = Number(filterYear);
    }

    const doctorants = await this.doctorantModel.find(query).lean();

    const filtered = doctorants.filter((doc) => {
      switch (filterStatus) {
        case 'Non envoyé au doctorant':
          return !doc.sendToDoctorant;
        case 'Envoyé au doctorant':
          return doc.sendToDoctorant;
        case 'Doctorant validé':
          return doc.doctorantValide === true;
        case 'Non validé par le doctorant':
          return doc.doctorantValide !== true;
        case 'Envoyé aux référents':
          return doc.sendToRepresentants === true;
        case 'Non envoyé aux référents':
          return doc.sendToRepresentants !== true;
        case 'Référents validés':
          return doc.representantValide === true;
        case 'Non validé par les référents':
          return doc.representantValide !== true;
        case 'Rapport final envoyé':
          return doc.finalSend === true;
        default:
          return true;
      }
    });

    const headers = [
      '_id',
      'prenom',
      'nom',
      'email',
      'ID_DOCTORANT',
      'importDate',
      'departementDoctorant',
      'datePremiereInscription',
      'anneeThese',
      'typeFinancement',
      'typeThesis',
      'missions',
      'titreThese',
      'intituleUR',
      'directeurUR',
      'nomPrenomHDR',
      'email_HDR',
      'intituleEquipe',
      'directeurEquipe',
      'directeurThese',
      'coDirecteurThese',
      'prenomMembre1',
      'nomMembre1',
      'emailMembre1',
      'univesityMembre1',
      'prenomMembre2',
      'nomMembre2',
      'emailMembre2',
      'univesityMembre2',
      'prenomAdditionalMembre',
      'nomAdditionalMembre',
      'emailAdditionalMembre',
      'universityAdditionalMembre',
      'nbHoursScientificModules',
      'nbHoursCrossDisciplinaryModules',
      'nbHoursProfessionalIntegrationModules',
      'totalNbHours',
      'posters',
      'conferencePapers',
      'publications',
      'publicCommunication',
      'dateValidation',
      'additionalInformation',
      ...Array.from({ length: 17 }).flatMap((_, i) => [
        `Q${i + 1}`,
        `Q${i + 1}_comment`,
      ]),
      'conclusion',
      'recommendation',
      'recommendation_comment',
      'sendToDoctorant',
      'doctorantValide',
      'NbSendToDoctorant',
      'sendToRepresentants',
      'representantValide',
      'NbSendToRepresentants',
      'gestionnaireDirecteurValide',
      'finalSend',
      'NbFinalSend',
      'rapport_nomOriginal',
      'rapport_cheminStockage',
      'rapport_url',
      'dateEntretien',
    ];

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Doctorants');
    sheet.addRow(headers);

    filtered.forEach((doc: Record<string, any>, index: number) => {
      const rapportUrl = doc.rapport?.cheminStockage
        ? `https://csi.edbiospc.fr/${doc.rapport.cheminStockage}`
        : '';

      const row = headers.map((key) => {
        if (key === 'rapport_nomOriginal')
          return doc.rapport?.nomOriginal ?? '';
        if (key === 'rapport_cheminStockage')
          return doc.rapport?.cheminStockage ?? '';
        if (key === 'rapport_url') return rapportUrl;

        const value = doc[key];
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'object' && value !== null)
          return JSON.stringify(value);

        return value ?? '';
      });

      console.log(`🟢 [${index + 1}] ${doc.nom} ${doc.prenom} ➜`, row);
      console.log(
        `✅ Vérification Q1: ${doc.Q1} | conclusion: ${doc.conclusion}`,
      );
      sheet.addRow(row);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res
      .header(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .header(
        'Content-Disposition',
        `attachment; filename=doctorants_filtres_${new Date().toISOString().slice(0, 10)}.xlsx`,
      )
      .send(buffer);
  }

  async getDoctorant(id: string) {
    return this.doctorantModel.findById(id);
  }

  async deleteAll() {
    console.log('🔥 Suppression de tous les doctorants...');
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
    const doctorants = await this.doctorantModel
      .find()
      .select('+formulaire')
      .lean();
    return doctorants as unknown as Doctorant[];
  }

  async delete(id: string): Promise<{ message: string }> {
    const deleted = await this.doctorantModel.findByIdAndDelete(id).exec();
    if (!deleted)
      throw new NotFoundException(`Doctorant avec ID ${id} introuvable`);
    return { message: 'Doctorant supprimé avec succès' };
  }

  async update(
    id: string,
    updateDoctorantDto: UpdateDoctorantDto,
  ): Promise<Doctorant> {
    try {
      console.log('🔄 Mise à jour du doctorant :', id);
      const updatedDoctorant = await this.doctorantModel.findByIdAndUpdate(
        id,
        updateDoctorantDto,
        { new: true },
      );

      if (!updatedDoctorant) {
        throw new NotFoundException(
          `❌ Doctorant avec l'ID ${id} introuvable.`,
        );
      }

      return updatedDoctorant;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour :', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findOne(idOrEmail: string): Promise<Doctorant | null> {
    if (idOrEmail.match(/^[0-9a-fA-F]{24}$/)) {
      return this.doctorantModel.findById(idOrEmail).exec();
    } else {
      return this.doctorantModel
        .findOne({ email: idOrEmail.toLowerCase().trim() })
        .exec();
    }
  }

  async findByEmail(email: string): Promise<Doctorant | null> {
    if (!email) {
      console.error("⚠️ ERREUR : L'email fourni est undefined !");
      return null;
    }
    return this.doctorantModel
      .findOne({ email: email.trim().toLowerCase() })
      .exec();
  }

  async saveDoctorant(data: any): Promise<Doctorant> {
    const existingDoctorant = await this.doctorantModel.findOne({
      email: data.email,
    });
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
    const updatedDoctorant = await this.doctorantModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    return updatedDoctorant;
  }

  async updateDoctorantByEmail(
    email: string,
    updateData: any,
  ): Promise<Doctorant> {
    return this.doctorantModel
      .findOneAndUpdate({ email }, updateData, { new: true })
      .exec();
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
        console.log(
          `[SERVICE] 🧐 Vérification du doctorant : ${doctorant.nom} (${doctorant.email})`,
        );

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
      }),
    );

    console.log('[SERVICE] ✅ Fin de checkAndUpdateAllStatuses.');
    return updatedDoctorants;
  }

  async findDoctorantByTokenEmail(
    doctorantEmail: string,
  ): Promise<Doctorant | null> {
    if (!doctorantEmail) {
      console.error("⚠️ ERREUR : L'email fourni est undefined !");
      return null;
    }

    const cleanedEmail = doctorantEmail.trim().replace(/\u200B/g, '');
    console.log(
      `[DEBUG] 🔍 Recherche du doctorant avec email (nettoyé) : '${cleanedEmail}'`,
    );

    const doctorant = await this.doctorantModel
      .findOne({
        email: { $regex: `^${cleanedEmail}$`, $options: 'i' }, // ✅ insensible à la casse
      })
      .exec();

    if (!doctorant) {
      console.log(`❌ Aucun doctorant trouvé pour '${cleanedEmail}'`);
    } else {
      console.log(
        `✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom} (${doctorant.email})`,
      );
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

    // Détection du séparateur (virgule ou point-virgule)
    const firstLine = csvData.split(/\r?\n/)[0];
    const separator = firstLine && firstLine.includes(';') ? ';' : ',';
    console.log(`🔍 [DEBUG] Séparateur détecté : '${separator}'`);

    return new Promise((resolve, reject) => {
      const readableStream = require('stream').Readable.from(csvData);

      readableStream
        .pipe(csvParser({ separator }))
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

            const existingDoctorant = await this.doctorantModel
              .findOne({ email })
              .exec();
            if (existingDoctorant) {
              console.log(
                `⚠️ Doctorant avec email ${email} existe déjà, ignoré.`,
              );
              continue;
            }

            let prenom = row[cleanKey('Prénom')]?.trim() || '';
            console.log(
              `🔍 [DEBUG] Prénom après nettoyage pour ${email} : '${prenom}'`,
            );

            if (!prenom) {
              console.warn(
                `⚠️ Prénom manquant pour ${email}, vérifie ton CSV.`,
              );
            }

            // Création de l'objet Doctorant avec importDate
            const newDoctorant = new this.doctorantModel({
              prenom,
              nom: row[cleanKey('Nom')]?.trim() || '',
              email,
              ID_DOCTORANT: row[cleanKey('ID_DOCTORANT')]?.trim() || '',
              departementDoctorant:
                row[
                cleanKey('DEPARTEMENT_DOCTORANT_DIRECT::Nom Département')
                ] || '',
              datePremiereInscription: this.safeParseDate(
                row[cleanKey('Date 1ère Inscription')],
              ),
              anneeThese: row[cleanKey('AnnéeThèse')] || '',
              typeFinancement: row[cleanKey('Type Financement Clean')] || '',
              missions: row[cleanKey('Missions')] || '',
              titreThese: row[cleanKey("Sujet Thèse à l'inscription")] || '',
              intituleUR:
                row[cleanKey('UnitésRecherche::Intitulé Unité Recherche')] ||
                '',
              directeurUR:
                row[cleanKey('UnitésRecherche::Nom_Prenom_DU')] || '',
              intituleEquipe:
                row[cleanKey('Equipes::Nom Equipe Affichée')] || '',
              directeurEquipe:
                row[cleanKey('Equipes::Nom_Prenom_Responsable')] || '',
              nomPrenomHDR: row[cleanKey('HDR::Nom_Prenom_HDR')] || '',
              email_HDR: row[cleanKey('HDR::Email_HDR')] || '',
              importDate: currentYear, // 🆕 Ajout de l'année d'importation
            });

            console.log(
              `📝 [DEBUG] Objet Doctorant avant insertion:`,
              newDoctorant,
            );
            await newDoctorant.save();
            insertedDoctorants.push(newDoctorant);
          }

          console.log(
            `✅ Importation terminée : ${insertedDoctorants.length} doctorants ajoutés.`,
          );
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
        { emailAdditionalMembre: email },
      ],
    });
  }

  async generateNewPDF(doctorant: Doctorant): Promise<Buffer> {
    console.log('🔍 Génération du PDF pour :', doctorant.nom, doctorant.prenom);

    // 📄 Création du PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);

    const bandeauPath = path.join(
      __dirname,
      '../../assets/images/BandeauBioSPC.jpeg',
    );
    const bandeauBytes = fs.readFileSync(bandeauPath);
    const bandeauImage = await pdfDoc.embedJpg(bandeauBytes);
    const bandeauDims = bandeauImage.scale(0.5);

    const drawHeader = (pageToEdit: PDFPage) => {
      pageToEdit.drawImage(bandeauImage, {
        x: (600 - bandeauDims.width) / 2,
        y: 800 - bandeauDims.height - 10,
        width: bandeauDims.width,
        height: bandeauDims.height,
      });
    };

    drawHeader(page);

    // 🔥 Importation des polices standard
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 🎨 Couleurs Uniformes (Updated)
    const burgundyColor = rgb(0.545, 0.082, 0.220); // Burgundy #8B1538 (Chapter Titles & Main Report Title)
    const blueColor = rgb(0, 0.2, 0.404); // Blue #003367 (Section Titles)

    // Mapping for usage
    const primaryTitleColor = burgundyColor;
    const sectionTitleColor = blueColor;

    const textColor = rgb(0, 0, 0);       // Noir
    const grayColor = rgb(0.4, 0.4, 0.4); // Gris
    const accentColor = rgb(0.8, 0.1, 0.1); // Rouge discret (Corrections)

    let y = 730; // 📌 Position initiale
    const marginLeft = 50;
    const marginRight = 550;
    const marginBottom = 50;
    const maxWidth = marginRight - marginLeft;

    // Fonction pour gérer le saut de page
    const newPage = () => {
      page = pdfDoc.addPage([600, 800]);
      y = 770;
    };

    // --- HELPER FUNCTIONS ---

    const cleanText = (text: string | null): string => {
      if (!text) return 'N/A';
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .replace(/\t/g, '    ')
        .replace(/\r?\n|\r/g, ' ')
        .replace(/[^\x00-\x7F]/g, (char) => {
          const replacements: Record<string, string> = {
            '±': '+/-', '•': '-', '×': 'x', '→': '->', '“': '"', '”': '"', '‘': "'", '’': "'"
          };
          return replacements[char] || '?';
        })
        .trim();
    };

    const wrapText = (text: string, size: number, fontToUse: any, width_: number) => {
      const words = text.split(' ');
      let line = '';
      const result = [];
      for (const word of words) {
        const testLine = line.length ? line + ' ' + word : word;
        if (fontToUse.widthOfTextAtSize(testLine, size) < width_) {
          line = testLine;
        } else {
          result.push(line);
          line = word;
        }
      }
      if (line) result.push(line);
      return result;
    };

    const addTitleWidthVar = (label: string, value: string | null) => {
      if (y <= marginBottom) newPage();
      if (!value) return;

      const cleanedValue = cleanText(value).replace(/\n/g, ' ');
      const fullText = `${label} ${cleanedValue}`;
      const lines = wrapText(fullText, 16, boldFont, maxWidth);

      for (const l of lines) {
        if (y <= marginBottom) newPage();
        // Center align the main title
        const textWidth = boldFont.widthOfTextAtSize(l, 16);
        const centeredX = (600 - textWidth) / 2;
        page.drawText(l, { x: centeredX, y, size: 16, font: boldFont, color: primaryTitleColor });
        y -= 25;
      }
      y -= 10;
    };

    const addSectionTitle = (title: string) => {
      y -= 35;
      if (y <= marginBottom) newPage();

      const cleanedTitle = cleanText(title);
      const lines = wrapText(cleanedTitle, 16, boldFont, maxWidth - 20);
      const lineHeight = 20;
      const titleHeight = lines.length * lineHeight + 10;

      if (y - titleHeight <= marginBottom) newPage();

      page.drawRectangle({
        x: marginLeft - 5,
        y: y - titleHeight + 15,
        width: maxWidth + 10,
        height: titleHeight,
        color: rgb(0.95, 0.95, 0.95),
      });

      y -= 5;
      for (const l of lines) {
        page.drawText(l, { x: marginLeft, y, size: 16, font: boldFont, color: sectionTitleColor });
        y -= 20;
      }

      page.drawLine({
        start: { x: marginLeft, y: y + 5 },
        end: { x: marginRight, y: y + 5 },
        thickness: 2,
        color: sectionTitleColor,
      });

      y -= 20;
    };

    const addWrappedText = (label: string, value: string | null) => {
      if (y <= marginBottom) newPage();
      if (value === null || value === undefined || value === '') return;

      const cleanedValue = cleanText(value).replace(/\n/g, ' ');
      const labelWidth = boldFont.widthOfTextAtSize(label, 10);
      const text = cleanedValue;

      const lines = [];
      let words = text.split(' ');
      let line = '';

      for (let word of words) {
        let testLine = line + (line.length ? ' ' : '') + word;
        let textWidth = font.widthOfTextAtSize(testLine, 10);

        // First line accounts for label width
        let currentLineWidth = (lines.length === 0) ? (maxWidth - labelWidth - 10) : maxWidth;

        if (textWidth < currentLineWidth) {
          line = testLine;
        } else {
          lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);

      page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont });

      lines.forEach((line, index) => {
        const xPosition = index === 0 ? marginLeft + labelWidth + 10 : marginLeft;
        if (y <= marginBottom) newPage();
        page.drawText(line, { x: xPosition, y, size: 10, font });
        y -= 10;
      });
      console.log('✍️ Writing:', label, value, 'at y =', y);
      y -= 5;
    };

    const addWrappedText3 = (label: string, value1: string | null, value2: string | null) => {
      if (y <= marginBottom) newPage();
      if (!value1 && !value2) return;

      const cleanedValue1 = cleanText(value1) || 'N/A';
      const cleanedValue2 = cleanText(value2) || 'N/A';
      const fullText = `${cleanedValue1} - ${cleanedValue2}`;
      const labelWidth = boldFont.widthOfTextAtSize(label, 10) + 5;

      // Logic similar to addWrappedText helper above but simplified for 3 args
      const words = fullText.split(' ');
      let line = '';
      const lines: string[] = [];

      for (const word of words) {
        const testLine = line.length ? line + ' ' + word : word;
        // Optimization: simplified wrapping check (perfect wrapping requires index awareness inside loop like above)
        // Re-using strict logic:
        let currentMaxWidth = (lines.length === 0) ? (maxWidth - labelWidth) : maxWidth;
        if (font.widthOfTextAtSize(testLine, 10) < currentMaxWidth) {
          line = testLine;
        } else {
          lines.push(line);
          line = word;
        }
      }
      if (line) lines.push(line);

      page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont });

      lines.forEach((line, index) => {
        const xPosition = index === 0 ? marginLeft + labelWidth : marginLeft;
        if (y <= marginBottom) newPage();
        page.drawText(line, { x: xPosition, y, size: 10, font });
        y -= 10;
      });
      y -= 5;
    };

    const addWrappedTextContent = (value: string | null, color = textColor) => {
      if (y <= marginBottom) newPage();
      if (!value) return;
      const cleanedValue = cleanText(value) || 'N/A';
      const lines = wrapText(cleanedValue, 10, font, maxWidth);
      lines.forEach((line) => {
        if (y <= marginBottom) newPage();
        page.drawText(line, { x: marginLeft, y, size: 10, font, color });
        y -= 12;
      });
      y -= 5;
    };

    const addTitle = (title: string) => {
      y -= 15;
      if (y <= marginBottom) newPage();
      const cleanedTitle = cleanText(title);
      const lines = wrapText(cleanedTitle, 12, boldFont, maxWidth);
      for (const l of lines) {
        if (y <= marginBottom) newPage();
        page.drawText(l, { x: marginLeft, y, size: 12, font: boldFont, color: textColor });
        y -= 16;
      }
      y -= 5;
    };

    // --- RENDERERS FOR SYSTEM BLOCKS ---

    const renderers: Record<string, () => void> = {
      'identity': () => {
        // Title handled dynamically
        addWrappedText('First Name :', doctorant.prenom);
        addWrappedText('Family Name :', doctorant.nom);
        addWrappedText('Email :', doctorant.email);
        addWrappedText(
          'Date first registration :',
          doctorant.datePremiereInscription?.toISOString().split('T')[0],
        );
        addWrappedText('Unique ID :', doctorant.ID_DOCTORANT);
        addWrappedText("Doctoral student's department :", doctorant.departementDoctorant);
        addWrappedText('Your ORCID identification number :', doctorant.orcid);

        let interviewDate: Date | null = null;
        if (doctorant.dateEntretien instanceof Date && !isNaN(doctorant.dateEntretien.getTime())) {
          interviewDate = doctorant.dateEntretien;
        } else if (doctorant.dateEntretien === null) {
          interviewDate = doctorant.dateValidation;
        }
        if (interviewDate) {
          addWrappedText('Date of interview :', interviewDate.toISOString().split('T')[0]);
        }
      },
      'thesis_info': () => {
        addWrappedText('Thesis Title :', doctorant.titreThese);
        addWrappedText('Funding :', doctorant.typeFinancement);
      },
      'research_unit': () => {
        addWrappedText('Research unit :', doctorant.intituleUR);
        addWrappedText('Director of the research unit :', doctorant.directeurUR);
      },
      'team_info': () => {
        addWrappedText('Team :', doctorant.intituleEquipe);
        addWrappedText('Team leader :', doctorant.directeurEquipe);
        addWrappedText3('Thesis supervisor :', doctorant.nomPrenomHDR, doctorant.email_HDR);
        addWrappedText('Thesis co-supervisor (optional) :', doctorant.coDirecteurThese);
      },
      'csi_members': () => {
        addWrappedText3('Member #1 :', doctorant.nomMembre1, doctorant.emailMembre1);
        addWrappedText3('Member #2 :', doctorant.nomMembre2, doctorant.emailMembre2);
        addWrappedText3('Additional member :', doctorant.nomAdditionalMembre, doctorant.emailAdditionalMembre);
      },
      'scientific_activities': () => {
        addWrappedText('Missions :', doctorant.missions);
        addWrappedText('Publications :', doctorant.publications);
        addWrappedText('Conferences :', doctorant.conferencePapers);
        addWrappedText('Posters :', doctorant.posters);
        addWrappedText('Public communications :', doctorant.publicCommunication);
      },
      'training_modules': () => {
        addWrappedText('Scientific modules (cumulated hours) :', `${doctorant.nbHoursScientificModules || 0}h`);
        addWrappedText('Cross-disciplinary modules (cumulated hours) :', `${doctorant.nbHoursCrossDisciplinaryModules || 0}h`);
        addWrappedText('Professional integration and career development modules (cumulated hours) :', `${doctorant.nbHoursProfessionalIntegrationModules || 0}h`);
        addWrappedText('Total number of hours (all modules) :', `${doctorant.totalNbHours || 0}h`);
        if (doctorant.selfEvaluation) {
          addWrappedText('Self-assessment of competency acquisition :', `${doctorant.selfEvaluation} / 5`);
        }
        addWrappedText('Additional information :', doctorant.additionalInformation);
      },
      'documents_upload': () => {
        if (doctorant.fichiersExternes && doctorant.fichiersExternes.length > 0) {
          if (y - 50 <= marginBottom) newPage();
          y -= 30;
          page.drawText('Annual Scientific Report', { x: marginLeft, y, size: 14, font: boldFont, color: primaryTitleColor });
          y -= 20;
          page.drawText('Please see on next pages', { x: marginLeft, y, size: 12, font });
          y -= 40;
        }
      },
      'conclusion_recommendations': () => {
        if (doctorant.referentRating || (doctorant.referentComment && doctorant.referentComment !== 'N/A')) {
          addSectionTitle("Director's Opinion (Referent)");
          if (doctorant.referentRating) addWrappedText('Global Rating :', `${doctorant.referentRating} / 5`);
          if (doctorant.referentComment) addWrappedText('Comment :', doctorant.referentComment);
        }

        if (doctorant.conclusion || doctorant.recommendation) {
          if (y - 100 <= marginBottom) newPage();
          addSectionTitle('Conclusion and recommendations');
          if (doctorant.conclusion) addWrappedText('Conclusion :', doctorant.conclusion);

          const recommendationLabels: Record<string, string> = {
            approve: 'The committee approves the re-registration',
            disapprove: 'The committee disapproves of the re-registration',
            exemption: 'The committee supports the request for an exemption for an additional registration',
            unfavourable: 'The committee issues an unfavourable opinion on the request for a derogation for additional registration',
            new_meeting: 'The committee advises scheduling a new meeting with the CSI',
          };

          if (doctorant.recommendation) {
            const readableRecommendation = recommendationLabels[doctorant.recommendation] || doctorant.recommendation;
            addWrappedText('Recommendation :', readableRecommendation);
          }
          if (doctorant.recommendation_comment) {
            addWrappedText('Comment on the recommandation :', doctorant.recommendation_comment);
          }
        }

        if (doctorant.suiviComment) {
          if (y <= marginBottom) newPage();
          addSectionTitle('Administrative Follow-up');
          addWrappedTextContent(doctorant.suiviComment);
        }
      }
    };


    // 🔥 MAIN RENDERING LOOP 🔥

    // 1. Title is always first
    addTitleWidthVar('Rapport Annuel - CSI Year ', doctorant.anneeThese);

    // 2. Fetch all questions sorted
    const allQuestions = await this.questionModel.find({}).sort({ order: 1 }).lean();

    const doctorantQuestions = allQuestions.filter(q => q.target === 'doctorant');
    const referentQuestions = allQuestions.filter(q => q.target === 'referent');

    // 3. Helper to handle embedding files ASYNC
    const embedFiles = async () => {
      if (!doctorant.fichiersExternes || doctorant.fichiersExternes.length === 0) return;
      for (const fichier of doctorant.fichiersExternes) {
        const filePath = path.join(__dirname, '../../', fichier.cheminStockage);
        if (!fs.existsSync(filePath) || !filePath.endsWith('.pdf')) continue;
        try {
          const fileBytes = fs.readFileSync(filePath);
          const embeddedPdf = await PDFDocument.load(fileBytes);
          const copiedPages = await pdfDoc.embedPages(embeddedPdf.getPages());
          copiedPages.forEach((embeddedPage) => {
            const { width, height } = embeddedPage;
            const newPage = pdfDoc.addPage([width, height]);
            newPage.drawPage(embeddedPage, { x: 0, y: 0, width, height });
          });
          console.log(`✅ Fichier ajouté: ${fichier.nomOriginal}`);
        } catch (error) {
          console.error(`❌ Erreur ajout fichier ${filePath}:`, error);
        }
      }
      newPage();
    };

    let currentSection = '';

    // --- RENDER DOCTORANT QUESTIONS ---

    for (const q of doctorantQuestions) {

      // 1. Global Section Handling
      if (q.type !== 'chapter_title' && q.section && q.section !== 'Uncategorized' && q.section !== currentSection) {
        addSectionTitle(q.section);
        currentSection = q.section;
      }

      // A. SYSTEM BLOCK
      if (q.systemId) {
        if (renderers[q.systemId]) {
          if (q.systemId === 'documents_upload') {
            renderers[q.systemId](); // Render header text
            await embedFiles();      // Async embed files
          } else {
            renderers[q.systemId](); // Render text fields
          }
        }
        continue; // System block handled, move next
      }

      // B. CHAPTER TITLE
      if (q.type === 'chapter_title') {
        if (y <= marginBottom + 100) newPage();
        y -= 40;
        page.drawText(q.content, { x: marginLeft, y, size: 20, font: boldFont, color: primaryTitleColor });
        page.drawLine({ start: { x: marginLeft, y: y - 5 }, end: { x: marginRight, y: y - 5 }, thickness: 3, color: primaryTitleColor });
        y -= 40;
        currentSection = ''; // Reset section context
        continue;
      }

      // C. REGULAR QUESTION
      if (q.visibleInPdf === false) continue;

      const response = doctorant.responses?.find(r => r.questionId === q._id.toString());
      let val = response?.value;
      let comment = response?.comment;

      if (!val) val = 'N/A';

      // Render Question
      if (y - 50 <= marginBottom) newPage();
      addTitle(q.content);

      // Student Answer
      if (y - 40 <= marginBottom) newPage();
      addWrappedText('Student Answer :', val);

      // Comment
      if (comment && comment !== 'N/A') {
        if (y - 30 <= marginBottom) newPage();
        addWrappedText('Comment :', comment);
      }

      // Referent Correction
      const correctionId = `${q._id}_corrected_referent`;
      const correction = doctorant.responses?.find(r => r.questionId === correctionId);
      if (correction) {
        if (y - 50 <= marginBottom) newPage();
        y -= 15;

        // Construct Dynamic Referent Names
        console.log('DEBUG: doctorant member fields:', {
          nomMembre1: doctorant.nomMembre1,
          prenomMembre1: doctorant.prenomMembre1,
          nomMembre2: doctorant.nomMembre2,
          prenomMembre2: doctorant.prenomMembre2,
          nomAdditionalMembre: doctorant.nomAdditionalMembre,
          prenomAdditionalMembre: doctorant.prenomAdditionalMembre,
          nomPrenomHDR: doctorant.nomPrenomHDR
        });

        const referents: string[] = [];
        if (doctorant.nomMembre1) referents.push(`${doctorant.prenomMembre1 || ''} ${doctorant.nomMembre1}`.trim());
        if (doctorant.nomMembre2) referents.push(`${doctorant.prenomMembre2 || ''} ${doctorant.nomMembre2}`.trim());
        if (doctorant.nomAdditionalMembre) referents.push(`${doctorant.prenomAdditionalMembre || ''} ${doctorant.nomAdditionalMembre}`.trim());

        console.log('DEBUG: constructed referents array:', referents);

        // Fallback: if no members found, use existing HDR field or generic
        if (referents.length === 0 && doctorant.nomPrenomHDR) referents.push(doctorant.nomPrenomHDR);

        const correctedByLabel = referents.length > 0 ? `Corrected by ${referents.join(' & ')}:` : "Corrected by Referent:";

        page.drawText(correctedByLabel, { x: marginLeft, y, size: 10, font: boldFont, color: accentColor });
        y -= 12;
        addWrappedTextContent(correction.value, accentColor);
        if (correction.comment) {
          addWrappedTextContent(`Reason: ${correction.comment}`, accentColor);
        }
        y -= 5;
      }
      y -= 15;
    }

    // --- RENDER REFERENT QUESTIONS (If any) ---
    // If we have referent questions that are VISIBLE in PDF, render them
    // Usually Referent questions are implicitly 'visibleToReferent: true', 'visibleInPdf: true'??
    // Let's assume yes.

    if (referentQuestions.length > 0) {

      // Add a separator or specific title?
      // Maybe "Referent Evaluation" or similar if not provided by section/chapter
      // BUT: Referent questions might have their own Chapter Titles!
      // So we just iterate them.
      // We do NOT reset 'currentSection' blindly?
      // Actually, if Referent starts with a new Section, it will catch it.
      // But if it relies on 'currentSection' from Doctorant, that's bad.
      // Let's reset it to be safe, so the first Referent section is printed.
      currentSection = '';

      for (const q of referentQuestions) {

        // 1. Global Section Handling
        if (q.type !== 'chapter_title' && q.section && q.section !== 'Uncategorized' && q.section !== currentSection) {
          addSectionTitle(q.section);
          currentSection = q.section;
        }

        // Referent questions usually don't have System Blocks (except maybe custom ones, but 'identity' etc are Doctorant)
        // But if they did, the loop handles it IF specific renderers existed. (Likely none).
        // We just reused the loop logic for Regular & Chapter.

        // B. CHAPTER TITLE
        if (q.type === 'chapter_title') {
          if (y <= marginBottom + 100) newPage();
          y -= 40;
          page.drawText(q.content, { x: marginLeft, y, size: 20, font: boldFont, color: primaryTitleColor });
          page.drawLine({ start: { x: marginLeft, y: y - 5 }, end: { x: marginRight, y: y - 5 }, thickness: 3, color: primaryTitleColor });
          y -= 40;
          currentSection = '';
          continue;
        }

        // C. REGULAR QUESTION
        if (q.visibleInPdf === false) continue;

        const response = doctorant.responses?.find(r => r.questionId === q._id.toString());
        let val = response?.value;
        let comment = response?.comment;

        // IMPORTANT: For REFERENT questions, "val" is the REFERENT's Answer.
        // Is it stored in the same 'responses' array? Yes.

        if (!val) val = 'N/A';

        // Render Question
        if (y - 50 <= marginBottom) newPage();
        addTitle(q.content);

        // Referent Answer (Label should differ?)
        // "Referent Answer" or just "Answer"?
        // Or maybe "Evaluation"?
        if (y - 40 <= marginBottom) newPage();
        addWrappedText('Referent Answer :', val); // Distinguish

        // Comment
        if (comment && comment !== 'N/A') {
          if (y - 30 <= marginBottom) newPage();
          addWrappedText('Comment :', comment);
        }
        // No Check for "Referent Correction" on Referent Questions...

        y -= 15;
      }
    }

    // 📌 Génération des bytes du PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 📂 Définir le chemin du rapport PDF
    const uploadDir = path.join(
      __dirname,
      '../../uploads/doctorants',
      doctorant.ID_DOCTORANT,
      'rapport',
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `Rapport_${doctorant.nom}_${doctorant.prenom}_${doctorant._id}.pdf`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`✅ Rapport PDF sauvegardé à : ${filePath}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cheminStockage = `uploads/doctorants/${doctorant.ID_DOCTORANT}/rapport/${fileName}`;
    const publicURL = `${frontendUrl}/${cheminStockage}`;

    await this.doctorantModel.findByIdAndUpdate(
      doctorant._id,
      {
        rapport: {
          nomOriginal: fileName,
          cheminStockage,
          url: publicURL,
        },
      },
      { new: true },
    );

    return pdfBuffer;
  }
}
