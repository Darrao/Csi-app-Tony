import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorantService } from './doctorant.service';
import { DoctorantController } from './doctorant.controller';
import { Doctorant, DoctorantSchema } from './schemas/doctorant.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Doctorant.name, schema: DoctorantSchema }]),
    ],
    controllers: [DoctorantController],
    providers: [DoctorantService],
})
export class DoctorantModule {}