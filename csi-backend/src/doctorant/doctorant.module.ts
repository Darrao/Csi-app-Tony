import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctorant, DoctorantSchema } from './schemas/doctorant.schema';
import { DoctorantService } from './doctorant.service';
import { DoctorantController } from './doctorant.controller';
import { TokenModule } from '../token/token.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Doctorant.name, schema: DoctorantSchema }]),
        forwardRef(() => TokenModule),
    ],
    controllers: [DoctorantController],
    providers: [DoctorantService],
    exports: [DoctorantService],
})
export class DoctorantModule {}