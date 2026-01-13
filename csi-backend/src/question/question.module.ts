
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { Question, QuestionSchema } from './schemas/question.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Question.name, schema: QuestionSchema }])
    ],
    controllers: [QuestionController],
    providers: [QuestionService],
    exports: [QuestionService],
})
export class QuestionModule { }
