import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admin } from './schemas/admin.schema';

@Injectable()
export class AdminService {
  constructor(@InjectModel(Admin.name) private adminModel: Model<Admin>) {}

  async createAdmin(email: string, password: string) {
        if (password.startsWith("$2b$")) {
            console.error("⚠️ ERREUR : Le mot de passe fourni est déjà haché !");
            throw new Error("Le mot de passe ne doit pas être pré-haché !");
        }

        console.log(`🔑 Création d'un admin avec l'email : ${email}`);
        console.log(`📝 Mot de passe en clair avant hashage : ${password}`);

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`🔒 Mot de passe hashé avant insertion : ${hashedPassword}`);

        return this.adminModel.create({ email, password: hashedPassword });
    }

  async validateAdmin(email: string, password: string) {
        const admin = await this.adminModel.findOne({ email });
        if (!admin) {
            console.log(`❌ Aucun admin trouvé avec l'email : ${email}`);
            return null;
        }

        console.log(`🔑 Admin trouvé : ${admin.email}`);
        console.log(`📝 Mot de passe en clair reçu : ${password}`);
        console.log(`🔒 Hash stocké dans la base : ${admin.password}`);

        // Vérifie si le mot de passe stocké est déjà hashé
        if (!admin.password.startsWith("$2b$")) {
            console.error("⚠️ Le mot de passe stocké n'est pas hashé correctement !");
            return null;
        }

        // Teste le hashage manuellement
        const testHash = await bcrypt.hash(password, 10);
        console.log(`🔄 Mot de passe haché (test) : ${testHash}`);


        // Comparaison du mot de passe en clair avec le hash stocké
        const isMatch = await bcrypt.compare(password, admin.password);
        console.log(await bcrypt.compare(password, admin.password))
        console.log(`🔍 Résultat de la comparaison bcrypt : ${isMatch}`);

        if (!isMatch) {
            console.log("❌ Mot de passe incorrect !");
            return null;
        }

        console.log("✅ Connexion réussie !");
        return admin;
    }

  async findAdminByEmail(email: string): Promise<Admin | null> {
    return this.adminModel.findOne({ email }).exec();
  }
}