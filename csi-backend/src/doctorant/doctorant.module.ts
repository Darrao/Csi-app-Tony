import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctorant, DoctorantSchema } from './schemas/doctorant.schema';
import { DoctorantService } from './doctorant.service';
import { DoctorantController } from './doctorant.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Doctorant.name, schema: DoctorantSchema }]),
    ],
    controllers: [DoctorantController],
    providers: [DoctorantService],
    exports: [MongooseModule], // Exporter MongooseModule pour que d'autres modules puissent l'utiliser
})
export class DoctorantModule {}