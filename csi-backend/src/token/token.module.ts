import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schemas/token.schema';
import { TokenService } from './token.service';
// import { TokenController } from './token.controller';
import { DoctorantModule } from '../doctorant/doctorant.module'; // Importer le module Doctorant

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
        DoctorantModule, // Ajoutez DoctorantModule ici
    ],
    // controllers: [TokenController],
    providers: [TokenService],
    exports: [TokenService],
})
export class TokenModule {}