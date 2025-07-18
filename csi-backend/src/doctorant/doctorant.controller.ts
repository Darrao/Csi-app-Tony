import {
  Body,
  Controller,
  Get,
  Query,
  Post,
  Param,
  Delete,
  Put,
  Res,
  NotFoundException,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
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
import { Multer, diskStorage, File } from 'multer';
import * as path from 'path';
import { format } from 'fast-csv';
import { EmailConfigService } from '../emailConfig/email-config.service';
import { config } from '../config';
import { FastifyReply } from 'fastify';

@Controller('doctorant')
export class DoctorantController {
  constructor(
    private readonly doctorantService: DoctorantService,
    private readonly tokenService: TokenService,
    private readonly emailConfigService: EmailConfigService,
    @InjectModel(Doctorant.name)
    private readonly doctorantModel: Model<Doctorant>,
  ) {}

  @Get('refresh-statuses')
  async refreshStatuses(): Promise<any> {
    console.log('testest');

    try {
      const doctorants = await this.doctorantService.findAll();
      console.log(
        '[CONTROLLER] ✅ Données des doctorants récupérées:',
        doctorants,
      );

      if (doctorants.length === 0) {
        console.error('Aucun doctorant trouvé.');
        return { message: 'Aucun doctorant trouvé.' };
      }

      return doctorants;
    } catch (error) {
      console.error(
        '[CONTROLLER] Erreur lors de la récupération des doctorants :',
        error,
      );
      return {
        message: 'Erreur lors de la récupération des doctorants.',
        error: error.message,
      };
    }
  }

  @Get('/export/zip')
  async exportZip(
    @Query('searchTerm') searchTerm: string,
    @Query('filterStatus') filterStatus: string,
    @Query('filterYear') filterYear: string,
    @Res() res: Response,
  ) {
    const zipBuffer = await this.doctorantService.generateAllReportsZip({
      searchTerm,
      filterStatus,
      filterYear,
    });

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Rapports_Doctorants_${new Date()
        .toISOString()
        .slice(0, 10)}.zip"`,
    });

    res.end(zipBuffer);
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
  async update(
    @Param('id') id: string,
    @Body() updateDoctorantDto: CreateDoctorantDto,
  ) {
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
      throw new NotFoundException('Doctorant introuvable.');
    }

    // 🚫 Bloque l'accès si le doctorant a validé son formulaire
    if (doctorant.doctorantValide) {
      throw new BadRequestException(
        'Le formulaire a déjà été validé et ne peut plus être modifié.',
      );
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
  async sendLink(
    @Param('id') id: string,
    @Body('email') email: string,
    @Body('prenom') prenom: string,
    @Body('nom') nom: string,
  ) {
    try {
      // 🔍 Récupération de la configuration email depuis la BDD
      const emailConfig = await this.emailConfigService.getEmailConfig();
      if (!emailConfig) {
        throw new NotFoundException('Configuration email introuvable.');
      }

      console.log(`✅ Configuration email récupérée.`);
      console.log(
        `📧 Envoi de l'email à ${email} pour le doctorant ${prenom} ${nom} (ID: ${id})`,
      );

      // 🔗 Génération du lien de modification
      const link = `${config.FRONTEND_URL}/modifier/${id}`;

      // 🎯 Récupération des liens dynamiques depuis la BDD
      const presentationTemplate = emailConfig.presentationTemplate;
      const csiPdfExplicatif = emailConfig.csiPdfExplicatif;
      const csiProposalLink = emailConfig.csiProposalLink;
      const contactLink = emailConfig.contactLink;

      // 🎯 Récupération du template d'email depuis la configuration
      const emailTemplate = emailConfig.firstDoctorantEmail;

      // 🔄 Remplacement des variables dynamiques dans le template d'email
      const emailContent = this.emailConfigService.replaceEmailVariables(
        emailTemplate,
        {
          prenom,
          nom,
          link,
          presentationTemplate,
          csiPdfExplicatif,
          csiProposalLink,
          contactLink,
        },
      );

      // ✉️ Envoi de l'email
      const subject =
        'Important: Instructions for Your Annual Report Submission';
      await sendMail(email, subject, emailContent);

      // 🔥 Mise à jour du statut dans la base
      const doctorant = await this.doctorantService.findByEmail(email);
      if (doctorant && doctorant._id instanceof Object) {
        await this.doctorantService.updateDoctorant(doctorant._id.toString(), {
          sendToDoctorant: true,
          NbSendToDoctorant: (doctorant.NbSendToDoctorant || 0) + 1,
        });
      } else {
        console.error('❌ Erreur: `doctorant._id` est invalide :', doctorant);
      }

      return { message: 'Email envoyé avec succès.' };
    } catch (error) {
      return { message: "Erreur lors de l'envoi de l'email.", error };
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

    return {
      message: 'Données reçues, mais gestion des représentants désactivée.',
      success: true,
    };
  }

  @Get('export/csv')
  async exportDoctorants(@Res() res: Response) {
    try {
      const doctorants = await this.doctorantModel.find().lean();

      if (doctorants.length === 0) {
        console.warn('⚠️ Aucun doctorant trouvé.');
        return res.status(404).json({ message: 'Aucun doctorant trouvé.' });
      }

      console.log(`📦 Export de ${doctorants.length} doctorants`);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=doctorants.csv',
      );

      const headers = [
        'ID_DOCTORANT',
        'nom',
        'prenom',
        'email',
        'anneeThese',
        'departementDoctorant',
        'titreThese',
        'missions',
        'intituleUR',
        'directeurUR',
        'intituleEquipe',
        'directeurEquipe',
        'nomPrenomHDR',
        'email_HDR',
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
        'report',
        'nbHoursScientificModules',
        'nbHoursCrossDisciplinaryModules',
        'nbHoursProfessionalIntegrationModules',
        'totalNbHours',
        'posters',
        'conferencePapers',
        'publications',
        'publicCommunication',
        'additionalInformation',
        ...Array.from({ length: 17 }).flatMap((_, i) => [
          `Q${i + 1}`,
          `Q${i + 1}_comment`,
        ]),
        'conclusion',
        'recommendation',
        'recommendation_comment',
        'rapport_nomOriginal',
        'rapport_cheminStockage',
        'rapport_url',
        'dateValidation',
        'dateEntretien',
        'sendToDoctorant',
        'sendToRepresentants',
        'finalSend',
        'NbSendToDoctorant',
        'NbSendToRepresentants',
        'NbFinalSend',
      ];

      const csvStream = format({ headers });
      csvStream.pipe(res);

      doctorants.forEach((doc, index) => {
        const form = (doc as any).formulaire ?? {};
        const rapportUrl = doc.rapport?.cheminStockage
          ? `${config.FRONTEND_URL}/${doc.rapport.cheminStockage}`
          : '';

        const Qdata: Record<string, string> = {};
        for (let i = 1; i <= 17; i++) {
          const q = `Q${i}`;
          Qdata[q] = doc[q] ?? '';
          Qdata[`${q}_comment`] = doc[`${q}_comment`] ?? '';
        }

        const row: Record<string, any> = { ...Qdata };

        headers.forEach((header) => {
          if (header in row) return; // skip Q1, Q1_comment etc. déjà remplis

          let value = '';

          if (header === 'rapport_url') {
            value = rapportUrl;
          } else if (header === 'rapport_nomOriginal') {
            value = doc.rapport?.nomOriginal ?? '';
          } else if (header === 'rapport_cheminStockage') {
            value = doc.rapport?.cheminStockage ?? '';
          } else {
            value = doc[header];
            if (value === undefined) {
              value = form[header];
            }
          }

          row[header] = value ?? '';
        });

        console.log(`✅ Doctorant ${index + 1} :`, row);

        csvStream.write(row);
      });

      csvStream.end();
    } catch (error) {
      console.error('❌ Erreur lors de l’export CSV:', error);
      res.status(500).json({
        message: 'Erreur interne lors de l’export CSV.',
        error: error.message,
      });
    }
  }

  @Get('export/filtered-csv')
  async exportFilteredDoctorants(
    @Res() res: Response,
    @Query('searchTerm') searchTerm: string,
    @Query('filterStatus') filterStatus: string,
    @Query('filterYear') filterYear: string,
  ) {
    try {
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

      console.log('🎛️ Paramètres reçus :', {
        searchTerm,
        filterStatus,
        filterYear,
      });

      const filtered = doctorants.filter((doc) => {
        const logLabel = `${doc.nom?.toUpperCase()} ${doc.prenom ?? ''}`;

        switch (filterStatus) {
          case 'Non envoyé au doctorant':
            console.log(
              `🧪 ${logLabel} ➜ sendToDoctorant =`,
              doc.sendToDoctorant,
            );
            return !doc.sendToDoctorant;

          case 'Envoyé au doctorant':
            console.log(
              `🧪 ${logLabel} ➜ sendToDoctorant =`,
              doc.sendToDoctorant,
            );
            return doc.sendToDoctorant;

          case 'Doctorant validé':
            console.log(
              `🧪 ${logLabel} ➜ doctorantValide =`,
              doc.doctorantValide,
            );
            return doc.doctorantValide === true;

          case 'Non validé par le doctorant':
            console.log(
              `🧪 ${logLabel} ➜ doctorantValide =`,
              doc.doctorantValide,
            );
            return doc.doctorantValide !== true;

          case 'Envoyé aux référents':
            console.log(
              `🧪 ${logLabel} ➜ sendToRepresentants =`,
              doc.sendToRepresentants,
            );
            return doc.sendToRepresentants === true;

          case 'Non envoyé aux référents':
            console.log(
              `🧪 ${logLabel} ➜ sendToRepresentants =`,
              doc.sendToRepresentants,
            );
            return doc.sendToRepresentants !== true;

          case 'Référents validés':
            console.log(
              `🧪 ${logLabel} ➜ representantValide =`,
              doc.representantValide,
            );
            return doc.representantValide === true;

          case 'Non validé par les référents':
            console.log(
              `🧪 ${logLabel} ➜ representantValide =`,
              doc.representantValide,
            );
            return doc.representantValide !== true;

          default:
            console.log(`🧪 ${logLabel} ➜ PAS DE FILTRE`);
            return true;
        }
      });

      if (filtered.length === 0) {
        return res
          .status(404)
          .json({ message: 'Aucun doctorant filtré trouvé.' });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=doctorants_filtres_${new Date()
          .toISOString()
          .slice(0, 10)}.csv`,
      );

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

      const csvStream = format({ headers });
      csvStream.pipe(res);

      filtered.forEach((doc) => {
        const rapportUrl = doc.rapport?.cheminStockage
          ? `${config.FRONTEND_URL}/${doc.rapport.cheminStockage}`
          : '';

        const row: Record<string, any> = {};

        headers.forEach((header) => {
          if (header === 'rapport_url') {
            row[header] = rapportUrl;
          } else if (header === 'rapport_nomOriginal') {
            row[header] = doc.rapport?.nomOriginal ?? '';
          } else if (header === 'rapport_cheminStockage') {
            row[header] = doc.rapport?.cheminStockage ?? '';
          } else {
            row[header] = doc[header] ?? '';
          }
        });

        csvStream.write(row);
      });

      csvStream.end();
    } catch (error) {
      console.error('❌ Erreur CSV filtré :', error);
      res
        .status(500)
        .json({ message: 'Erreur interne lors de l’export CSV filtré.' });
    }
  }

  @Get('export/filtered-xlsx')
  async exportFilteredXLSX(
    @Res() res: FastifyReply,
    @Query('searchTerm') searchTerm: string,
    @Query('filterStatus') filterStatus: string,
    @Query('filterYear') filterYear: string,
  ) {
    return this.doctorantService.exportFilteredXLSX(
      res,
      searchTerm,
      filterStatus,
      filterYear,
    );
  }

  @Get('export/pdf')
  async exportDoctorantsPDF(@Res() res: Response) {
    try {
      const doctorants = await this.doctorantService.findAll();
      if (doctorants.length === 0) {
        return res.status(404).json({ message: 'Aucun doctorant trouvé.' });
      }

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="doctorants.pdf"',
      );
      res.setHeader('Content-Type', 'application/pdf');

      const pdfBuffer = await this.doctorantService.generateNewPDF(
        doctorants[0],
      );
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({
        message: 'Erreur lors de la génération du PDF.',
        error: error.message,
      });
    }
  }

  @Get('export/pdf/:id')
  async exportDoctorantPDF(@Param('id') id: string, @Res() res: Response) {
    try {
      console.log(`📥 Demande d'export du PDF pour l'ID : ${id}`);

      const doctorant = await this.doctorantService.findOne(id);
      if (!doctorant) {
        console.error(`❌ Doctorant introuvable avec ID : ${id}`);
        return res.status(404).json({ message: 'Doctorant introuvable' });
      }

      console.log(`✅ Doctorant trouvé : ${doctorant.nom} ${doctorant.prenom}`);

      const pdfBuffer = await this.doctorantService.generateNewPDF(doctorant);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rapport_${doctorant.nom}_${doctorant.prenom}.pdf"`,
      });

      console.log(
        `📄 PDF généré avec succès pour ${doctorant.nom} ${doctorant.prenom}`,
      );
      return res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Erreur lors de la génération du PDF :', error);
      return res.status(500).json({
        message: 'Erreur lors de la génération du PDF',
        error: error.message,
      });
    }
  }

  @Post('import-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/tmp', // ⚠️ Crée ce dossier si nécessaire
        filename: (req, file, cb) =>
          cb(null, `${Date.now()}-${file.originalname}`),
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // ✅ 100 Mo de limite, tu peux mettre plus
      },
    }),
  )
  async importDoctorantsCSV(@UploadedFile() file: File, @Res() res: Response) {
    if (!file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    try {
      const buffer = fs.readFileSync(file.path, 'utf8');
      const result =
        await this.doctorantService.importDoctorantsFromCSV(buffer);
      return res.status(200).json({ message: 'Importation terminée.', result });
    } catch (error) {
      console.error('Erreur lors de l’importation CSV :', error);
      return res
        .status(500)
        .json({ message: 'Erreur interne', error: error.message });
    } finally {
      fs.unlink(file.path, () => {}); // 🔁 Supprime le fichier temporaire
    }
  }

  @Post('upload/:id')
  @UseInterceptors(
    FilesInterceptor('fichiersExternes', 5, {
      storage: diskStorage({
        destination: async (req, file, cb) => {
          try {
            const doctorant = await req.doctorantService.getDoctorant(
              req.params.id,
            );
            if (!doctorant || !doctorant.ID_DOCTORANT) {
              console.error(
                '❌ Doctorant introuvable ou ID_DOCTORANT manquant.',
              );
              return cb(
                new BadRequestException(
                  'Doctorant introuvable ou ID_DOCTORANT manquant.',
                ),
                null,
              );
            }

            // 📂 Dossier principal du doctorant
            const basePath = path.join(
              'uploads/doctorants',
              doctorant.ID_DOCTORANT,
            );

            // 📁 Création des sous-dossiers si besoin
            const uploadFolder = path.join(
              basePath,
              'fichiersUploadParDoctorant',
            );
            const rapportFolder = path.join(basePath, 'rapport');

            if (!fs.existsSync(uploadFolder)) {
              fs.mkdirSync(uploadFolder, { recursive: true });
            }
            if (!fs.existsSync(rapportFolder)) {
              fs.mkdirSync(rapportFolder, { recursive: true });
            }

            // 📂 On stocke les fichiers dans `fichiersUploadParDoctorant`
            cb(null, uploadFolder);
          } catch (error) {
            console.error(
              '❌ Erreur lors de la récupération du doctorant pour l’upload :',
              error,
            );
            return cb(
              new BadRequestException(
                'Erreur lors de la récupération du doctorant.',
              ),
              null,
            );
          }
        },
        filename: async (req, file, cb) => {
          try {
            const doctorant = await req.doctorantService.getDoctorant(
              req.params.id,
            );
            if (!doctorant || !doctorant.ID_DOCTORANT) {
              console.error(
                '❌ Doctorant introuvable ou ID_DOCTORANT manquant.',
              );
              return cb(
                new BadRequestException(
                  'Doctorant introuvable ou ID_DOCTORANT manquant.',
                ),
                null,
              );
            }

            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(
              null,
              `${doctorant.ID_DOCTORANT}-${uniqueSuffix}${path.extname(file.originalname)}`,
            );
          } catch (error) {
            console.error(
              '❌ Erreur lors de la récupération du doctorant pour le nom du fichier :',
              error,
            );
            return cb(
              new BadRequestException(
                'Erreur lors de la récupération du doctorant.',
              ),
              null,
            );
          }
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(pdf|docx|txt)$/)) {
          return cb(
            new BadRequestException(
              'Seuls les fichiers PDF, DOCX et TXT sont autorisés.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFiles(
    @Param('id') id: string,
    @UploadedFiles() files: Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new NotFoundException('Aucun fichier reçu.');
    }

    const doctorant = await this.doctorantService.getDoctorant(id);
    if (!doctorant) {
      throw new NotFoundException('Doctorant non trouvé.');
    }

    const fichiersAjoutes = files.map((file) => ({
      nomOriginal: file.originalname,
      cheminStockage: file.path,
    }));

    // Conserver uniquement les 2 derniers fichiers uploadés
    const fichiersFinals = [...fichiersAjoutes].slice(-2);

    await this.doctorantService.updateDoctorant(id, {
      fichiersExternes: fichiersFinals,
    });

    return {
      message: 'Fichiers uploadés avec succès',
      fichiersExternes: fichiersFinals,
    };
  }

  @Post('upload-rapport/:id')
  @UseInterceptors(
    FileInterceptor('rapport', {
      storage: diskStorage({
        destination: async (req, file, cb) => {
          try {
            const doctorant = await req.doctorantService.getDoctorant(
              req.params.id,
            );
            if (!doctorant || !doctorant.ID_DOCTORANT) {
              console.error(
                '❌ Doctorant introuvable ou ID_DOCTORANT manquant.',
              );
              return cb(
                new BadRequestException(
                  'Doctorant introuvable ou ID_DOCTORANT manquant.',
                ),
                null,
              );
            }

            // 📂 Dossier principal du doctorant
            const basePath = path.join(
              'uploads/doctorants',
              doctorant.ID_DOCTORANT,
            );
            const rapportFolder = path.join(basePath, 'rapport');

            if (!fs.existsSync(rapportFolder)) {
              fs.mkdirSync(rapportFolder, { recursive: true });
            }

            cb(null, rapportFolder);
          } catch (error) {
            console.error(
              '❌ Erreur lors de la récupération du doctorant pour l’upload du rapport :',
              error,
            );
            return cb(
              new BadRequestException(
                'Erreur lors de la récupération du doctorant.',
              ),
              null,
            );
          }
        },
        filename: async (req, file, cb) => {
          try {
            const doctorant = await req.doctorantService.getDoctorant(
              req.params.id,
            );
            if (!doctorant || !doctorant.ID_DOCTORANT) {
              console.error(
                '❌ Doctorant introuvable ou ID_DOCTORANT manquant.',
              );
              return cb(
                new BadRequestException(
                  'Doctorant introuvable ou ID_DOCTORANT manquant.',
                ),
                null,
              );
            }

            // 📝 On écrase l'ancien rapport avec un nouveau nom standardisé
            cb(null, `Rapport_${doctorant.ID_DOCTORANT}.pdf`);
          } catch (error) {
            console.error(
              '❌ Erreur lors de la récupération du doctorant pour le nom du fichier :',
              error,
            );
            return cb(
              new BadRequestException(
                'Erreur lors de la récupération du doctorant.',
              ),
              null,
            );
          }
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.pdf$/)) {
          return cb(
            new BadRequestException(
              'Seuls les fichiers PDF sont autorisés pour les rapports.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadRapport(
    @Param('id') id: string,
    @UploadedFile() file: Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('Aucun fichier reçu.');
    }

    const doctorant = await this.doctorantService.getDoctorant(id);
    if (!doctorant) {
      throw new NotFoundException('Doctorant non trouvé.');
    }

    const rapportInfo = {
      nomOriginal: file.originalname,
      cheminStockage: file.path,
    };

    await this.doctorantService.updateDoctorant(id, { rapport: rapportInfo });

    return { message: 'Rapport uploadé avec succès', rapport: rapportInfo };
  }

  @Get('rapport/:id')
  async getRapport(@Param('id') id: string) {
    const doctorant = await this.doctorantService.getDoctorant(id);
    if (!doctorant || !doctorant.rapport) {
      throw new NotFoundException('Aucun rapport trouvé.');
    }

    return {
      message: 'Rapport trouvé',
      rapport: doctorant.rapport,
    };
  }

  @Get(':id')
  async getDoctorant(@Param('id') id: string) {
    const doctorant = await this.doctorantService.getDoctorant(id);
    if (!doctorant) throw new NotFoundException('Doctorant non trouvé.');
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
      return {
        message: 'Tous les doctorants ont été supprimés avec succès.',
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error('Erreur lors de la suppression des doctorants :', error);
      throw new BadRequestException(
        'Erreur lors de la suppression des doctorants.',
      );
    }
  }
}
