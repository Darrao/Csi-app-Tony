import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctorant } from './schemas/doctorant.schema';
import { CreateDoctorantDto } from './dto/create-doctorant.dto';

@Injectable()
export class DoctorantService {
    constructor(@InjectModel(Doctorant.name) private doctorantModel: Model<Doctorant>) {}

    async create(createDoctorantDto: any): Promise<Doctorant> {
        const { email, representant1, representant2, ...otherData } = createDoctorantDto;
        const normalizedEmail = email.trim().toLowerCase(); // Normalisation ici
    
        const createdDoctorant = new this.doctorantModel({
            ...otherData,
            email: normalizedEmail,
            representantData: {
                champPlus1: representant1 || null,
                champPlus2: representant2 || null,
            },
        });
    
        return createdDoctorant.save();
    }

    async findAll(): Promise<Doctorant[]> {
        return this.doctorantModel.find().exec();
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
    
        // Construisez `representantData` si `representant1` et `representant2` existent
        if (updateData.representant1 && updateData.representant2) {
            updateData.representantData = {
                champPlus1: updateData.representant1,
                champPlus2: updateData.representant2,
            };
            delete updateData.representant1;
            delete updateData.representant2;
        }
    
        const result = await this.doctorantModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        ).exec();
    
        console.log('Résultat de la mise à jour :', result);
        return result;
    }
}