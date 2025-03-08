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
        return this.emailConfigModel.find().exec();
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

    replaceEmailVariables(template: string, variables: Record<string, string>): string {
        return template.replace(/\${(.*?)}/g, (_, key) => variables[key] || '');
    }
}