import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailConfig, EmailConfigDocument } from './schemas/email-config.schema';

@Injectable()
export class EmailConfigService {
    constructor(@InjectModel(EmailConfig.name) private emailConfigModel: Model<EmailConfigDocument>) {}

    async create(data: Partial<EmailConfig>): Promise<EmailConfig> {
        const emailConfig = new this.emailConfigModel(data);
        return emailConfig.save();
    }

    async findAll(): Promise<EmailConfig[]> {
        const configs = await this.emailConfigModel.find().exec();
        console.log("🔍 Configurations récupérées depuis MongoDB :", configs);
        return configs;
    }

    async update(id: string, data: Partial<EmailConfig>): Promise<EmailConfig> {
        const updated = await this.emailConfigModel.findByIdAndUpdate(id, data, { new: true }).exec();
        if (!updated) throw new NotFoundException('Configuration email non trouvée');
        return updated;
    }

    async delete(id: string): Promise<{ message: string }> {
        const deleted = await this.emailConfigModel.findByIdAndDelete(id).exec();
        if (!deleted) throw new NotFoundException('Configuration email non trouvée');
        return { message: 'Configuration supprimée avec succès' };
    }

    async resetAndCreate(data: Partial<EmailConfig> & { _id?: string }): Promise<EmailConfig> {
        // Supprime toutes les configurations existantes
        await this.emailConfigModel.deleteMany({});
    
        // Supprime explicitement `_id` s'il est vide avant d'envoyer à MongoDB
        if (data._id === '') {
            delete data._id;
        }
    
        // Crée une nouvelle configuration propre
        const emailConfig = new this.emailConfigModel(data);
        return emailConfig.save();
    }

    async getEmailConfig(): Promise<EmailConfig | null> {
        return this.emailConfigModel.findOne({ active: true }).exec();
    }

    async export(): Promise<EmailConfig> {
        // Return the first config found (assuming there's only one active or relevant one)
        const config = await this.emailConfigModel.findOne().exec();
        if (!config) throw new NotFoundException('Aucune configuration à exporter');
        return config;
    }

    async import(data: Partial<EmailConfig>): Promise<EmailConfig> {
        // We reuse resetAndCreate because it does exactly what we want:
        // delete everything and create a new one from data
        return this.resetAndCreate(data);
    }

    replaceEmailVariables(template: string, variables: Record<string, string>): string {
        return template.replace(/\${(.*?)}/g, (_, key) => variables[key] || '');
    }
}