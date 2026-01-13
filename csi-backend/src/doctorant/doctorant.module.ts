import { Module, forwardRef, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctorant, DoctorantSchema } from './schemas/doctorant.schema';
import { DoctorantService } from './doctorant.service';
import { DoctorantController } from './doctorant.controller';
import { TokenModule } from '../token/token.module';
import { EmailConfigModule } from '../emailConfig/email-config.module';
import { DoctorantMiddleware } from './doctorant.middleware';

import { Question, QuestionSchema } from '../question/schemas/question.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Doctorant.name, schema: DoctorantSchema },
            { name: Question.name, schema: QuestionSchema }
        ]),
        forwardRef(() => TokenModule),
        EmailConfigModule,
    ],
    controllers: [DoctorantController],
    providers: [DoctorantService],
    exports: [DoctorantService],
})

export class DoctorantModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(DoctorantMiddleware).forRoutes(DoctorantController);
    }
}