import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schemas/token.schema';
import { TokenService } from './token.service';
import { DoctorantModule } from '../doctorant/doctorant.module';
import { Doctorant, DoctorantSchema } from '../doctorant/schemas/doctorant.schema'; // ✅ Ajoute Doctorant ici

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Token.name, schema: TokenSchema },
            { name: Doctorant.name, schema: DoctorantSchema } // ✅ Ajout du modèle Doctorant
        ]),
        forwardRef(() => DoctorantModule),
    ],
    providers: [TokenService],
    exports: [TokenService],
})
export class TokenModule {}