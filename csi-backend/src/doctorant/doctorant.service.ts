import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  OnModuleInit,
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
import 'dotenv/config';
import * as archiver from 'archiver';
import { Readable } from 'stream';
import { FastifyReply } from 'fastify';
import { Workbook } from 'exceljs';

@Injectable()
export class DoctorantService implements OnModuleInit {
  constructor(
    @InjectModel(Doctorant.name) private doctorantModel: Model<Doctorant>,
    @InjectModel(Question.name) private questionModel: Model<Question>,
  ) {}

  async onModuleInit() {
    try {
      await this.doctorantModel.collection.dropIndex('email_1');
      console.log(
        '✅ Index unique email_1 supprimé pour autoriser les doublons par année',
      );
    } catch {
      // Ignoré si l'index n'existe pas ou a déjà été supprimé
    }
  }

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

  async deleteAll(year?: number) {
    if (year) {
      console.log(`🔥 Suppression des doctorants pour l'année : ${year}...`);
      return await this.doctorantModel.deleteMany({ importDate: year });
    }
    console.log('🔥 Suppression de TOUS les doctorants...');
    return await this.doctorantModel.deleteMany({}); // 🔥 Supprime TOUS les doctorants
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

  async update(id: string, updateDoctorantDto: any): Promise<Doctorant> {
    try {
      console.log(
        '🔄 UPDATE doctorant:',
        id,
        '| responses count:',
        updateDoctorantDto?.responses?.length,
      );

      // 🔥 BULLETPROOF UPDATE: Fetch, Merge, Mark, Save
      const doctorant = await this.doctorantModel.findById(id);
      if (!doctorant) {
          throw new NotFoundException(`❌ Doctorant avec l'ID ${id} introuvable.`);
      }

      // Cleanup payload and merge
      const { _id, __v, ...updateData } = updateDoctorantDto;
      Object.assign(doctorant, updateData);

      // Force Mongoose to see nested arrays as modified
      if (updateData.responses) {
          doctorant.markModified('responses');
      }
      if (updateData.referentResponses) {
          doctorant.markModified('referentResponses');
      }

      const updated = await doctorant.save();
      console.log(`✅ [BACKEND SUCCESS] Doctorant ${id} saved. Responses: ${updated.responses?.length}, Referent: ${updated.referentResponses?.length}`);
      
      return updated;

      if (!updated) {
        throw new NotFoundException(
          `❌ Doctorant avec l'ID ${id} introuvable.`,
        );
      }

      console.log(
        '✅ Saved responses count:',
        (updated as any)?.responses?.length,
      );
      return updated;
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
        .sort({ importDate: -1 })
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
      .sort({ importDate: -1 })
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

    const doc = await this.doctorantModel.findById(id).exec();
    if (!doc) {
      throw new Error('Doctorant introuvable');
    }

    // Copie les propriétés
    Object.assign(doc, updateData);

    // Force la détection des changements pour les tableaux complexes
    if (updateData.responses) {
      doc.markModified('responses');
    }
    if (updateData.referentResponses) {
      doc.markModified('referentResponses');
    }

    return await doc.save();
  }

  async updateDoctorantByEmail(
    email: string,
    updateData: any,
  ): Promise<Doctorant> {
    return this.doctorantModel
      .findOneAndUpdate({ email }, updateData, {
        new: true,
        sort: { importDate: -1 },
      })
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
      .sort({ importDate: -1 })
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

  async importDoctorantsFromCSV(
    input: string | Buffer,
    importYear?: number,
    force = false,
    filename?: string,
  ): Promise<any> {
    let csvData = '';
    let detectedEncoding = 'UTF-8';

    if (Buffer.isBuffer(input)) {
      // Détection de l'encodage par BOM (Byte Order Mark)
      if (input[0] === 0xff && input[1] === 0xfe) {
        csvData = input.toString('utf16le');
        detectedEncoding = 'UTF-16LE';
      } else if (input[0] === 0xfe && input[1] === 0xff) {
        // UTF-16BE : Node ne le supporte pas nativement en toString, on swap les octets pour lire en LE
        const swapped = Buffer.from(input);
        swapped.swap16();
        csvData = swapped.toString('utf16le');
        detectedEncoding = 'UTF-16BE (Swapped to LE)';
      } else if (input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf) {
        csvData = input.toString('utf8'); // UTF-8 avec BOM
        detectedEncoding = 'UTF-8-BOM';
      } else {
        // Fallback : on vérifie s'il y a des octets nuls (typiquement UTF-16 sans BOM)
        const hasNulls = input.slice(0, 100).some((b) => b === 0);
        if (hasNulls) {
          csvData = input.toString('utf16le');
          detectedEncoding = 'UTF-16LE (Detected by nulls)';
        } else {
          csvData = input.toString('utf8');
        }
      }
    } else {
      csvData = input;
    }

    console.log(
      `📂 [IMPORT] Taille CSV brute : ${csvData?.length || 0} caractères (Encodage: ${detectedEncoding})`,
    );
    if (!csvData || csvData.length < 5) {
      return {
        totalRowsParsed: 0,
        inserted: 0,
        skippedDuplicate: 0,
        skippedNoEmail: 0,
        skippedMissingData: 0,
        errors: 0,
        message: 'Fichier vide ou trop court.',
        debug: { size: input.length, version: 'v2.1-buffer-support' },
      };
    }

    const rows = [];
    const cleanKey = (key: string) =>
      key
        .replace(/^\ufeff/, '')
        .replace(/[\u2018\u2019\u02bc]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .trim();
    const currentYear = importYear ?? new Date().getFullYear();

    // Détection robuste du séparateur
    const lines = csvData.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const firstLine = lines[0] || '';

    // On compte le nombre de colonnes produites par chaque séparateur potentiel
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    let separator = ',';
    if (semiCount > commaCount && semiCount > tabCount) separator = ';';
    else if (tabCount > commaCount && tabCount > semiCount) separator = '\t';

    console.log(
      `🔍 [IMPORT] Séparateur détecté : '${separator}' (Commas: ${commaCount}, Semis: ${semiCount}, Tabs: ${tabCount})`,
    );
    console.log(
      `🔍 [IMPORT] Première ligne : "${firstLine.substring(0, 100)}..."`,
    );

    return new Promise(async (resolve, reject) => {
      const isExcel =
        filename &&
        (filename.toLowerCase().endsWith('.xlsx') ||
          filename.toLowerCase().endsWith('.xls'));
      const processRows = async () => {
        const stats: any = {
          totalRowsParsed: rows.length,
          inserted: 0,
          skippedDuplicate: 0,
          skippedNoEmail: 0,
          skippedMissingData: 0,
          errors: 0,
          skippedRowsDetails: [], // NOUVEAU
          debug: {
            size: isExcel ? input.length : csvData.length,
            preview: isExcel
              ? 'Fichier Excel (.xlsx/.xls) - Parsing natif'
              : csvData.substring(0, 50).replace(/[\r\n]/g, ' '),
            isUTF16: isExcel ? false : csvData.includes('\u0000'),
            isXLSX: isExcel || csvData.startsWith('PK'),
            separator: isExcel ? 'N/A' : separator,
            version: 'v4.1-excel-support',
            encoding: isExcel ? 'Binary Excel' : detectedEncoding,
            timestamp: new Date().toISOString(),
          },
        };

        // Si 0 lignes, on donne un message d'aide
        let message = '';
        if (rows.length === 0) {
          if (stats.debug.isXLSX)
            message =
              "Ce fichier semble être un Excel (.xlsx) renommé en .csv. Enregistrez-le bien au format 'CSV (séparateur point-virgule)' dans Excel.";
          else if (stats.debug.isUTF16)
            message =
              "Le fichier semble être en UTF-16. Essayez de l'enregistrer en format 'CSV UTF-8' dans Excel.";
          else
            message =
              "Aucune ligne détectée. Vérifiez que le fichier n'est pas vide et que les colonnes sont correctes.";
        }

        for (const row of rows) {
          const keys = Object.keys(row);
          const findValue = (partials: string[]) => {
            const key = keys.find((k) =>
              partials.some((p) => k.toLowerCase().includes(p.toLowerCase())),
            );
            return key ? row[key]?.trim() || '' : '';
          };

          const email = findValue(['email', 'envoi']);
          if (!email) {
            stats.skippedNoEmail++;
            const prenom = findValue(['prénom', 'prenom']);
            const nom = findValue(['nom']);
            if (prenom || nom) {
              stats.skippedRowsDetails.push(`${prenom} ${nom}`.trim());
            }
            continue;
          }

          if (!force) {
            const existing = await this.doctorantModel.findOne({
              email,
              importDate: currentYear,
            });
            if (existing) {
              stats.skippedDuplicate++;
              continue;
            }
          }

          // [RESTRICTED-RESTORE] Mapping intelligent pour les exports complets
          const doctorantData: any = {
            email,
            importDate: currentYear,
          };

          for (const csvKey of keys) {
            const val = row[csvKey];
            if (!val) continue;

            const ck = cleanKey(csvKey).toLowerCase();

            const normalizedCk = ck
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '');

            // Noms / Prénoms
            if (
              ['prénom', 'prenom', 'first name', 'firstname'].includes(
                normalizedCk,
              )
            )
              doctorantData.prenom = val.trim();
            else if (
              ['nom', 'last name', 'lastname', 'surname'].includes(normalizedCk)
            )
              doctorantData.nom = val.trim().toUpperCase();
            // ✅ Gestion du champ combiné "Prénom Nom" ou "Nom Prénom" (export FileMaker)
            else if (
              normalizedCk === 'prenom_nom' ||
              normalizedCk === 'prenomnom' ||
              normalizedCk === 'nom_prenom' ||
              normalizedCk === 'nomprenom' ||
              normalizedCk === 'prenom nom' ||
              normalizedCk === 'nom prenom'
            ) {
              const parts = val.trim().split(/\s+/);
              if (parts.length >= 2) {
                if (normalizedCk.startsWith('prenom')) {
                  // Format: "Prénom NOM" → first word = prénom, rest = nom
                  doctorantData.prenom = parts[0];
                  doctorantData.nom = parts.slice(1).join(' ').toUpperCase();
                } else {
                  // Format: "NOM Prénom" → last word(s) = prénom, first = nom
                  doctorantData.nom = parts[0].toUpperCase();
                  doctorantData.prenom = parts.slice(1).join(' ');
                }
              } else {
                // Single word: put in prenom if not set, else nom
                if (!doctorantData.prenom) doctorantData.prenom = val.trim();
                else if (!doctorantData.nom)
                  doctorantData.nom = val.trim().toUpperCase();
              }
            } else if (['id_doctorant'].includes(normalizedCk))
              doctorantData.ID_DOCTORANT = val;

            // Réponses Q1-Q17 et commentaires
            const qMatch = ck.match(/^q(\d+)(_comment)?$/);
            if (qMatch) {
              const field = `Q${qMatch[1]}${qMatch[2] || ''}`;
              doctorantData[field] = val;
            }

            // Autres champs mappés existants
            if (normalizedCk.includes('departement')) {
              let dep = val;
              if (dep.includes('DIRECT::'))
                dep = dep.replace('DIRECT::', '').trim();
              doctorantData.departementDoctorant = dep;
            }
            if (
              normalizedCk.includes('anneethese') ||
              (normalizedCk.includes('these') && normalizedCk.includes('annee'))
            )
              doctorantData.anneeThese = val;
            if (normalizedCk.includes('missions')) doctorantData.missions = val;
            if (
              normalizedCk.includes('titrethese') ||
              normalizedCk.includes('sujet these') ||
              normalizedCk.includes('sujetthese')
            )
              doctorantData.titreThese = val;
            if (normalizedCk.includes('conclusion'))
              doctorantData.conclusion = val;
            if (normalizedCk === 'recommendation')
              doctorantData.recommendation = val;
            if (normalizedCk.includes('recommendation_comment'))
              doctorantData.recommendation_comment = val;

            // Nouveaux champs FM export 2026/2025
            if (
              normalizedCk === 'calc_hdr' ||
              normalizedCk.includes('directeur de these') ||
              ck.includes('hdr')
            )
              doctorantData.nomPrenomHDR = val;
            if (normalizedCk.includes('intitule unite recherche'))
              doctorantData.intituleUR = val;
            if (normalizedCk.includes('nom_prenom_du'))
              doctorantData.directeurUR = val;
            if (normalizedCk.includes('nom equipe affichee'))
              doctorantData.intituleEquipe = val;
            if (
              normalizedCk.includes('nom_prenom_responsable') ||
              normalizedCk.includes('referent')
            )
              doctorantData.directeurEquipe = val;

            // Date du dernier CSI
            if (ck.includes('cr csi dernier::annéedatecsi')) {
              const year = parseInt(val, 10);
              if (!isNaN(year)) {
                doctorantData.dateEntretien = new Date(year, 0, 1);
              }
            }

            // Membres du CSI (parse prénom et nom)
            if (
              normalizedCk.includes('membre') &&
              normalizedCk.includes('1') &&
              !normalizedCk.includes('email')
            ) {
              if (
                normalizedCk.includes('prenom') ||
                normalizedCk.includes('prénom')
              )
                doctorantData.prenomMembre1 = val;
              else if (normalizedCk.includes('nom'))
                doctorantData.nomMembre1 = val.toUpperCase();
              else {
                const parts = val.trim().split(/\s+/);
                doctorantData.prenomMembre1 =
                  doctorantData.prenomMembre1 || parts[0] || '';
                doctorantData.nomMembre1 =
                  doctorantData.nomMembre1 ||
                  parts.slice(1).join(' ').toUpperCase() ||
                  '';
              }
            }
            if (
              normalizedCk.includes('email') &&
              normalizedCk.includes('membre') &&
              normalizedCk.includes('1')
            )
              doctorantData.emailMembre1 = val;

            if (
              normalizedCk.includes('membre') &&
              normalizedCk.includes('2') &&
              !normalizedCk.includes('email')
            ) {
              if (
                normalizedCk.includes('prenom') ||
                normalizedCk.includes('prénom')
              )
                doctorantData.prenomMembre2 = val;
              else if (normalizedCk.includes('nom'))
                doctorantData.nomMembre2 = val.toUpperCase();
              else {
                const parts = val.trim().split(/\s+/);
                doctorantData.prenomMembre2 =
                  doctorantData.prenomMembre2 || parts[0] || '';
                doctorantData.nomMembre2 =
                  doctorantData.nomMembre2 ||
                  parts.slice(1).join(' ').toUpperCase() ||
                  '';
              }
            }
            if (
              normalizedCk.includes('email') &&
              normalizedCk.includes('membre') &&
              normalizedCk.includes('2')
            )
              doctorantData.emailMembre2 = val;

            if (
              normalizedCk.includes('membre') &&
              (normalizedCk.includes('3') ||
                normalizedCk.includes('additional') ||
                normalizedCk.includes('additionel') ||
                normalizedCk.includes('additionnel')) &&
              !normalizedCk.includes('email')
            ) {
              if (
                normalizedCk.includes('prenom') ||
                normalizedCk.includes('prénom')
              )
                doctorantData.prenomAdditionalMembre = val;
              else if (normalizedCk.includes('nom'))
                doctorantData.nomAdditionalMembre = val.toUpperCase();
              else {
                const parts = val.trim().split(/\s+/);
                doctorantData.prenomAdditionalMembre =
                  doctorantData.prenomAdditionalMembre || parts[0] || '';
                doctorantData.nomAdditionalMembre =
                  doctorantData.nomAdditionalMembre ||
                  parts.slice(1).join(' ').toUpperCase() ||
                  '';
              }
            }
            if (
              normalizedCk.includes('email') &&
              normalizedCk.includes('membre') &&
              (normalizedCk.includes('3') ||
                normalizedCk.includes('additional') ||
                normalizedCk.includes('additionel') ||
                normalizedCk.includes('additionnel'))
            )
              doctorantData.emailAdditionalMembre = val;

            // Activités de recherche et heures (Restoration-specific)
            if (ck.includes('posters')) doctorantData.posters = val;
            if (ck.includes('conference')) doctorantData.conferencePapers = val;
            if (ck.includes('publications')) doctorantData.publications = val;
            if (ck.includes('communication'))
              doctorantData.publicCommunication = val;
            if (ck.includes('scientifique') && ck.includes('heure'))
              doctorantData.nbHoursScientificModules = parseFloat(val) || 0;
            if (ck.includes('transversale') && ck.includes('heure'))
              doctorantData.nbHoursCrossDisciplinaryModules =
                parseFloat(val) || 0;
            if (ck.includes('insertion') && ck.includes('heure'))
              doctorantData.nbHoursProfessionalIntegrationModules =
                parseFloat(val) || 0;
          }

          try {
            if (force) {
              await this.doctorantModel.findOneAndUpdate(
                { email, importDate: currentYear },
                doctorantData,
                { upsert: true },
              );
            } else {
              await this.doctorantModel.create(doctorantData);
            }
            stats.inserted++;
          } catch (err) {
            stats.errors++;
            console.error(`❌ Erreur import ${email}:`, err.message);
          }
        }

        console.log('✅ Import terminé :', stats);
        resolve(stats);
      }; // end processRows

      if (isExcel) {
        try {
          if (!Buffer.isBuffer(input))
            throw new Error(
              'Le fichier Excel doit être fourni sous forme de Buffer.',
            );
          const XLSX = require('xlsx');
          const workbook = XLSX.read(input, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const jsonRows = XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            { defval: '' },
          );

          for (const row of jsonRows) {
            const cleanedRow = {};
            for (const key in row as any) {
              cleanedRow[cleanKey(key)] = String((row as any)[key]);
            }
            rows.push(cleanedRow);
          }
          await processRows();
        } catch (e) {
          console.error('❌ Erreur de parsing Excel :', e);
          reject(e);
        }
      } else {
        const readableStream = Readable.from(csvData);
        readableStream
          .pipe(csvParser({ separator }))
          .on('data', (row) => {
            const cleanedRow = {};
            for (const key in row) {
              cleanedRow[cleanKey(key)] = row[key];
            }
            rows.push(cleanedRow);
          })
          .on('end', async () => {
            await processRows();
          })
          .on('error', (error) => {
            console.error('❌ Erreur lors du parsing CSV :', error);
            reject(error);
          });
      }
    }); // end Promise
  }

  async findByReferentEmail(email: string) {
    return this.doctorantModel
      .findOne({
        $or: [
          { emailMembre1: email },
          { emailMembre2: email },
          { emailAdditionalMembre: email },
        ],
      })
      .sort({ importDate: -1 });
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
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // 🎨 Couleurs Uniformes (Updated)
    const burgundyColor = rgb(0.545, 0.082, 0.22); // Burgundy #8B1538 (Chapter Titles & Main Report Title)
    const blueColor = rgb(0, 0.2, 0.404); // Blue #003367 (Section Titles)

    // Mapping for usage
    const primaryTitleColor = burgundyColor;
    const sectionTitleColor = blueColor;

    const textColor = rgb(0, 0, 0); // Noir
    const descriptionColor = rgb(0.2, 0.2, 0.2); // Dark Gray for descriptions
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
            '±': '+/-',
            '•': '-',
            '×': 'x',
            '→': '->',
            '“': '"',
            '”': '"',
            '‘': "'",
            '’': "'",
          };
          return replacements[char] || '?';
        })
        .trim();
    };

    const wrapText = (
      text: string,
      size: number,
      fontToUse: any,
      width_: number,
    ) => {
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
        page.drawText(l, {
          x: centeredX,
          y,
          size: 16,
          font: boldFont,
          color: primaryTitleColor,
        });
        y -= 25;
      }
      y -= 10;
    };

    const addSectionTitle = (title: string) => {
      y -= 25; // Reduced from 35
      if (y <= marginBottom) newPage();

      const cleanedTitle = cleanText(title);
      const lines = wrapText(cleanedTitle, 14, boldFont, maxWidth - 20); // Size 16 -> 14
      const lineHeight = 18; // Reduced line height
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
        page.drawText(l, {
          x: marginLeft,
          y,
          size: 14,
          font: boldFont,
          color: sectionTitleColor,
        }); // Size 16 -> 14
        y -= 20;
      }

      page.drawLine({
        start: { x: marginLeft, y: y + 5 },
        end: { x: marginRight, y: y + 5 },
        thickness: 2,
        color: sectionTitleColor,
      });

      y -= 10; // Reduced from 20 (space after blue title)
    };

    const addWrappedText = (label: string, value: string | null) => {
      if (y <= marginBottom) newPage();
      if (value === null || value === undefined || value === '') return;

      const cleanedValue = cleanText(value).replace(/\n/g, ' ');
      const labelWidth = boldFont.widthOfTextAtSize(label, 10);
      const text = cleanedValue;

      const lines = [];
      const words = text.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + (line.length ? ' ' : '') + word;
        const textWidth = font.widthOfTextAtSize(testLine, 10);

        // First line accounts for label width
        const currentLineWidth =
          lines.length === 0 ? maxWidth - labelWidth - 10 : maxWidth;

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
        const xPosition =
          index === 0 ? marginLeft + labelWidth + 10 : marginLeft;
        if (y <= marginBottom) newPage();
        page.drawText(line, { x: xPosition, y, size: 10, font });
        y -= 10;
      });
      console.log('✍️ Writing:', label, value, 'at y =', y);
      y -= 5;
    };

    const addWrappedText3 = (
      label: string,
      value1: string | null,
      value2: string | null,
    ) => {
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
        const currentMaxWidth =
          lines.length === 0 ? maxWidth - labelWidth : maxWidth;
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
        page.drawText(l, {
          x: marginLeft,
          y,
          size: 12,
          font: boldFont,
          color: textColor,
        });
        y -= 16;
      }
      y -= 5;
    };

    const renderCompetencyQuestion = (content: string) => {
      // Split by first question mark to separate Title and Description
      const parts = content.split('?');
      let title = content;
      let description = '';

      if (parts.length > 1) {
        title = parts[0] + '?';
        description = parts.slice(1).join('?').trim();
      }

      // Render Title using standard addTitle (Bold, 12)
      addTitle(title);

      // Render Description (Regular, 10, Gray)
      if (description) {
        y += 5; // Reduce gap slightly
        const lines = wrapText(description, 10, font, maxWidth);
        for (const l of lines) {
          if (y <= marginBottom) newPage();
          page.drawText(l, {
            x: marginLeft,
            y,
            size: 10,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          });
          y -= 12;
        }
        y -= 10;
      }
    };

    // --- RENDERERS FOR SYSTEM BLOCKS ---

    const renderers: Record<string, () => void> = {
      identity: () => {
        // Title handled dynamically
        addWrappedText('First Name :', doctorant.prenom);
        addWrappedText('Family Name :', doctorant.nom);
        addWrappedText('Email :', doctorant.email);
        addWrappedText(
          'Date first registration :',
          doctorant.datePremiereInscription?.toISOString().split('T')[0],
        );
        addWrappedText('Unique ID :', doctorant.ID_DOCTORANT);
        addWrappedText(
          "Doctoral student's department :",
          doctorant.departementDoctorant,
        );
        addWrappedText('Your ORCID identification number :', doctorant.orcid);

        let interviewDate: Date | null = null;
        if (
          doctorant.dateEntretien instanceof Date &&
          !isNaN(doctorant.dateEntretien.getTime())
        ) {
          interviewDate = doctorant.dateEntretien;
        } else if (doctorant.dateEntretien === null) {
          interviewDate = doctorant.dateValidation;
        }
        if (interviewDate) {
          addWrappedText(
            'Date of interview :',
            interviewDate.toISOString().split('T')[0],
          );
        }
      },
      thesis_info: () => {
        addWrappedText('Thesis Title :', doctorant.titreThese);
        addWrappedText('Funding :', doctorant.typeFinancement);
      },
      research_unit: () => {
        addWrappedText('Research unit :', doctorant.intituleUR);
        addWrappedText(
          'Director of the research unit :',
          doctorant.directeurUR,
        );
      },
      team_info: () => {
        addWrappedText('Team :', doctorant.intituleEquipe);
        addWrappedText('Team leader :', doctorant.directeurEquipe);
        addWrappedText3(
          'Thesis supervisor :',
          doctorant.nomPrenomHDR,
          doctorant.email_HDR,
        );
        addWrappedText(
          'Thesis co-supervisor (optional) :',
          doctorant.coDirecteurThese,
        );
      },
      csi_members: () => {
        addWrappedText3(
          'Member #1 :',
          doctorant.nomMembre1,
          doctorant.emailMembre1,
        );
        addWrappedText3(
          'Member #2 :',
          doctorant.nomMembre2,
          doctorant.emailMembre2,
        );
        addWrappedText3(
          'Additional member :',
          doctorant.nomAdditionalMembre,
          doctorant.emailAdditionalMembre,
        );
      },
      scientific_activities: () => {
        addWrappedText('Missions :', doctorant.missions);
        addWrappedText('Publications :', doctorant.publications);
        addWrappedText('Conferences :', doctorant.conferencePapers);
        addWrappedText('Posters :', doctorant.posters);
        addWrappedText(
          'Public communications :',
          doctorant.publicCommunication,
        );
      },
      training_modules: () => {
        addWrappedText(
          'Scientific modules (cumulated hours) :',
          `${doctorant.nbHoursScientificModules || 0}h`,
        );
        addWrappedText(
          'Cross-disciplinary modules (cumulated hours) :',
          `${doctorant.nbHoursCrossDisciplinaryModules || 0}h`,
        );
        addWrappedText(
          'Professional integration and career development modules (cumulated hours) :',
          `${doctorant.nbHoursProfessionalIntegrationModules || 0}h`,
        );
        addWrappedText(
          'Total number of hours (all modules) :',
          `${doctorant.totalNbHours || 0}h`,
        );
        if (doctorant.selfEvaluation) {
          addWrappedText(
            'Self-assessment of competency acquisition :',
            `${doctorant.selfEvaluation} / 5`,
          );
        }
        addWrappedText(
          'Additional information :',
          doctorant.additionalInformation,
        );
      },
      documents_upload: () => {
        if (
          doctorant.fichiersExternes &&
          doctorant.fichiersExternes.length > 0
        ) {
          if (y - 50 <= marginBottom) newPage();
          y -= 30;
          page.drawText('Annual Scientific Report', {
            x: marginLeft,
            y,
            size: 14,
            font: boldFont,
            color: primaryTitleColor,
          });
          y -= 20;
          page.drawText('Please see on next pages', {
            x: marginLeft,
            y,
            size: 12,
            font,
          });
          y -= 40;
        }
      },
      conclusion_recommendations: () => {
        if (
          doctorant.referentRating ||
          (doctorant.referentComment && doctorant.referentComment !== 'N/A')
        ) {
          addSectionTitle("Director's Opinion (Referent)");
          if (doctorant.referentRating)
            addWrappedText(
              'Global Rating :',
              `${doctorant.referentRating} / 5`,
            );
          if (doctorant.referentComment)
            addWrappedText('Comment :', doctorant.referentComment);
        }

        if (doctorant.conclusion || doctorant.recommendation) {
          if (y - 100 <= marginBottom) newPage();
          addSectionTitle('Conclusion and recommendations');
          if (doctorant.conclusion)
            addWrappedText('Conclusion :', doctorant.conclusion);

          const recommendationLabels: Record<string, string> = {
            approve: 'The committee approves the re-registration',
            disapprove: 'The committee disapproves of the re-registration',
            exemption:
              'The committee supports the request for an exemption for an additional registration',
            unfavourable:
              'The committee issues an unfavourable opinion on the request for a derogation for additional registration',
            new_meeting:
              'The committee advises scheduling a new meeting with the CSI',
          };

          if (doctorant.recommendation) {
            const readableRecommendation =
              recommendationLabels[doctorant.recommendation] ||
              doctorant.recommendation;
            addWrappedText('Recommendation :', readableRecommendation);
          }
          if (doctorant.recommendation_comment) {
            addWrappedText(
              'Comment on the recommandation :',
              doctorant.recommendation_comment,
            );
          }
        }

        if (doctorant.suiviComment) {
          if (y <= marginBottom) newPage();
          addSectionTitle('Administrative Follow-up');
          addWrappedTextContent(doctorant.suiviComment);
        }
      },
    };

    // 🔥 MAIN RENDERING LOOP 🔥

    // 0. Official Preamble Placeholder
    const preambleText =
      'Ce document constitue le rapport final du Comité de Suivi Individuel (CSI). Il est destiné à l’École Doctorale et doit être conservé par le doctorant et ses encadrants. Les informations contenues sont strictement confidentielles.';
    // (Placeholder text - Tony will provide the final official version)

    if (preambleText) {
      const preambleLines = wrapText(preambleText, 9, italicFont, maxWidth);
      for (const line of preambleLines) {
        if (y <= marginBottom) newPage();
        page.drawText(line, {
          x: marginLeft,
          y,
          size: 9,
          font: italicFont,
          color: descriptionColor,
        });
        y -= 11;
      }
      y -= 15; // Space after preamble
    }

    // 1. Title is always first
    addTitleWidthVar('Rapport Annuel - CSI Year ', doctorant.anneeThese);

    // 2. Fetch all questions sorted
    const allQuestions = await this.questionModel
      .find({})
      .sort({ order: 1 })
      .lean();

    const doctorantQuestions = allQuestions.filter(
      (q) => q.target === 'doctorant',
    );
    const referentQuestions = allQuestions.filter(
      (q) => q.target === 'referent',
    );

    // 3. Helper to handle embedding files ASYNC
    const embedFiles = async () => {
      if (
        !doctorant.fichiersExternes ||
        doctorant.fichiersExternes.length === 0
      )
        return;
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
      if (
        q.type !== 'chapter_title' &&
        q.section &&
        q.section !== 'Uncategorized' &&
        q.section !== 'CHAPTER' &&
        q.section !== currentSection
      ) {
        addSectionTitle(q.section);
        currentSection = q.section;
      }

      // A. SYSTEM BLOCK
      if (q.systemId) {
        if (renderers[q.systemId]) {
          if (q.systemId === 'documents_upload') {
            renderers[q.systemId](); // Render header text
            await embedFiles(); // Async embed files
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
        page.drawText(q.content, {
          x: marginLeft,
          y,
          size: 16,
          font: boldFont,
          color: primaryTitleColor,
        }); // Size 20 -> 16
        page.drawLine({
          start: { x: marginLeft, y: y - 5 },
          end: { x: marginRight, y: y - 5 },
          thickness: 3,
          color: primaryTitleColor,
        });
        y -= 20; // Reduced from 40
        currentSection = ''; // Reset section context
        continue;
      }

      // B2. DESCRIPTION BLOCK
      if (q.type === 'description') {
        if (y <= marginBottom + 50) newPage();
        y -= 10;

        // Custom cleaner that preserves special chars but might still need some cleanup if pure raw input
        // But for descriptions, we want to keep most things.
        // Let's just normalize but NOT strip newlines globally.
        // Actually, we process paragraph by paragraph.

        const paragraphs = q.content.split(/\r?\n/);

        for (const rawPara of paragraphs) {
          // Clean paragraph individually
          // We can reuse 'cleanText' logic effectively if we removed the newline replacement there,
          // OR we just duplicate the safe char replacement here for descriptions.
          // Let's copy cleaning logic MINUS newline stripping.

          // Note: NFD normalization was used in cleanText.
          const cleanedPara = cleanText(rawPara);

          if (!cleanedPara) {
            // Empty line -> add space
            y -= 10;
            continue;
          }

          const lines = wrapText(cleanedPara, 12, italicFont, maxWidth);
          for (const l of lines) {
            if (y <= marginBottom) newPage();
            page.drawText(l, {
              x: marginLeft,
              y,
              size: 12,
              font: italicFont,
              color: descriptionColor,
            });
            y -= 14;
          }
          // Add a bit of space after paragraph?
          // y -= 5;
        }
        y -= 10;
        continue;
      }

      // C. REGULAR QUESTION
      if (q.visibleInPdf === false) continue;

      const response = doctorant.responses?.find(
        (r) => r.questionId === q._id.toString(),
      );
      let val = response?.value;
      if (Array.isArray(val)) {
        val = val.join(', ');
      }
      const comment = response?.comment;

      if (!val || (Array.isArray(val) && val.length === 0)) val = 'N/A';

      // Render Question
      if (y - 50 <= marginBottom) newPage();

      if (
        q.section &&
        (q.section.toLowerCase().includes('skill') ||
          q.section.toLowerCase().includes('compétence'))
      ) {
        renderCompetencyQuestion(q.content);
      } else {
        addTitle(q.content);
      }

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
      const correction = doctorant.referentResponses?.find(
        (r) => r.questionId === correctionId,
      );
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
          nomPrenomHDR: doctorant.nomPrenomHDR,
        });

        const referents: string[] = [];
        if (doctorant.nomMembre1)
          referents.push(
            `${doctorant.prenomMembre1 || ''} ${doctorant.nomMembre1}`.trim(),
          );
        if (doctorant.nomMembre2)
          referents.push(
            `${doctorant.prenomMembre2 || ''} ${doctorant.nomMembre2}`.trim(),
          );
        if (doctorant.nomAdditionalMembre)
          referents.push(
            `${doctorant.prenomAdditionalMembre || ''} ${doctorant.nomAdditionalMembre}`.trim(),
          );

        console.log('DEBUG: constructed referents array:', referents);

        // Fallback: if no members found, use existing HDR field or generic
        if (referents.length === 0 && doctorant.nomPrenomHDR)
          referents.push(doctorant.nomPrenomHDR);

        const correctedByLabel =
          referents.length > 0
            ? `Corrected by ${referents.join(' & ')}:`
            : 'Corrected by Referent:';

        page.drawText(correctedByLabel, {
          x: marginLeft,
          y,
          size: 10,
          font: boldFont,
          color: accentColor,
        });
        y -= 12;
        let correctionVal = correction.value;
        if (Array.isArray(correctionVal)) {
          correctionVal = correctionVal.join(', ');
        }
        addWrappedTextContent(correctionVal, accentColor);
        if (correction.comment) {
          addWrappedTextContent(`Reason: ${correction.comment}`, accentColor);
        }
        y -= 5;
      }
      y -= 15;
    }

    // --- RENDER REFERENT QUESTIONS (If any) ---
    // Check if there are any answers for referent questions
    // If NOT, we skip the entire block (First PDF case)
    const hasReferentAnswers =
      referentQuestions.some((q) => {
        const r = doctorant.responses?.find(
          (res: any) => res.questionId === q._id.toString(),
        );
        return r && r.value && r.value !== '' && r.value !== 'N/A';
      }) ||
      !!doctorant.conclusion ||
      !!doctorant.recommendation;

    if (referentQuestions.length > 0 && hasReferentAnswers) {
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
        if (
          q.type !== 'chapter_title' &&
          q.section &&
          q.section !== 'Uncategorized' &&
          q.section !== 'CHAPTER' &&
          q.section !== currentSection
        ) {
          addSectionTitle(q.section);
          currentSection = q.section;
        }

        // Referent questions usually don't have System Blocks (except maybe custom ones, but 'identity' etc are Doctorant)
        // But if they did, the loop handles it IF specific renderers existed. (Likely none).

        // A. SYSTEM BLOCK (Added for Conclusion/Recommendations which might be a System Block in Referent section)
        if (q.systemId) {
          if (renderers[q.systemId]) {
            renderers[q.systemId]();
          }
          continue;
        }

        // B. CHAPTER TITLE
        if (q.type === 'chapter_title') {
          if (y <= marginBottom + 100) newPage();
          y -= 40;
          page.drawText(q.content, {
            x: marginLeft,
            y,
            size: 16,
            font: boldFont,
            color: primaryTitleColor,
          }); // Size 20 -> 16
          page.drawLine({
            start: { x: marginLeft, y: y - 5 },
            end: { x: marginRight, y: y - 5 },
            thickness: 3,
            color: primaryTitleColor,
          });
          y -= 20; // Reduced from 40
          currentSection = '';
          continue;
        }

        // B2. DESCRIPTION BLOCK
        if (q.type === 'description') {
          if (y <= marginBottom + 50) newPage();
          y -= 10;

          const paragraphs = q.content.split(/\r?\n/);

          for (const rawPara of paragraphs) {
            const cleanedPara = cleanText(rawPara);

            if (!cleanedPara) {
              y -= 10; // Empty line
              continue;
            }

            const lines = wrapText(cleanedPara, 12, italicFont, maxWidth);
            for (const l of lines) {
              if (y <= marginBottom) newPage();
              page.drawText(l, {
                x: marginLeft,
                y,
                size: 12,
                font: italicFont,
                color: descriptionColor,
              });
              y -= 14;
            }
          }
          y -= 10;
          continue;
        }

        // C. REGULAR QUESTION
        if (q.visibleInPdf === false) continue;

        const response = doctorant.referentResponses?.find(
          (r) => r.questionId === q._id.toString(),
        );
        let val = response?.value;
        const comment = response?.comment;

        // IMPORTANT: For REFERENT questions, "val" is the REFERENT's Answer.
        // Is it stored in the same 'responses' array? Yes.

        if (Array.isArray(val)) {
          val = val.join(', ');
        }
        if (!val) val = 'N/A';

        // Render Question
        if (y - 50 <= marginBottom) newPage();

        if (
          q.section &&
          (q.section.toLowerCase().includes('skill') ||
            q.section.toLowerCase().includes('compétence'))
        ) {
          renderCompetencyQuestion(q.content);
        } else {
          addTitle(q.content);
        }

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

      // Force render Conclusion & Recommendations at the end
      if (renderers['conclusion_recommendations']) {
        renderers['conclusion_recommendations']();
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
