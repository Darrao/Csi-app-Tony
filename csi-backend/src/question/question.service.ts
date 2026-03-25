
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from './schemas/question.schema';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionService implements OnModuleInit {
    constructor(@InjectModel(Question.name) private questionModel: Model<QuestionDocument>) { }

    async onModuleInit() {
        // await this.seedQuestions(); // 🛑 Disabled to prevent overwriting custom questions
    }

    async seedQuestions() {
        // Check referent questions
        const referentCount = await this.questionModel.countDocuments({ target: 'referent' });

        const referentQuestions = [
            // Section: Advances in research
            { target: 'referent', section: 'Advances in research', type: 'plus_minus_comment', order: 1, content: 'Has the research question been clearly and adequately defined?' },
            { target: 'referent', section: 'Advances in research', type: 'plus_minus_comment', order: 2, content: 'Does the doctoral student have a comprehensive understanding of the research process and the tasks to be completed prior to the defense?' },
            { target: 'referent', section: 'Advances in research', type: 'plus_minus_comment', order: 3, content: 'Is the research progressing as expected? If not, would an extension of the thesis preparation period allow for a successful defense?' },

            // Section: Training conditions
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 4, content: 'Have all the scientific, material, and financial requirements necessary for the doctoral project been fulfilled?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 5, content: 'If the doctoral student is preparing his/her thesis within a collaborative framework, are the conditions satisfactory?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 6, content: 'How effectively are the thesis director or co-directors managing the supervision?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 7, content: 'Is the communication between the doctoral students and supervisors satisfactory?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 8, content: 'Is the doctoral student well-integrated into the research team or unit? Does he/she feel isolated?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 9, content: 'How motivated and determined is the doctoral student to progress with his/her work?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 10, content: 'Are there any signs of demotivation or discouragement?' },
            { target: 'referent', section: 'Training conditions', type: 'plus_minus_comment', order: 11, content: 'Is the doctoral student at risk of psychosocial stress?' },

            // Section: Skill development and future preparation
            { target: 'referent', section: 'Skill development and future preparation', type: 'plus_minus_comment', order: 12, content: 'Written output (progress report, bibliography re-view, article, conference abstract)?' },
            { target: 'referent', section: 'Skill development and future preparation', type: 'plus_minus_comment', order: 13, content: 'Has the doctoral student been educated on research ethics and scientific integrity, in terms of both conducting experiments and handling issues related to publication, authorship, and copyright of scientific works?' },
            { target: 'referent', section: 'Skill development and future preparation', type: 'plus_minus_comment', order: 14, content: 'Are the doctoral student’s presentation skills up to par? Consider factors such as clarity, ability to synthesize information, quality of supporting materials, oral fluency, and teaching skills.' },
            { target: 'referent', section: 'Skill development and future preparation', type: 'plus_minus_comment', order: 15, content: 'Do the doctoral student has opportunities to broaden his.her scientific culture in his.her field of research and international perspective (seminars, thematic schools, congresses, ED forum)?' },
            { target: 'referent', section: 'Skill development and future preparation', type: 'plus_minus_comment', order: 16, content: 'How is the training portfolio progressing?' },
            { target: 'referent', section: 'Skill development and future preparation', type: 'plus_minus_comment', order: 17, content: 'How is the preparation for the doctoral student’s future career progressing?' },
        ];

        if (referentCount === 0) {
            console.log('🌱 Seeding referent questions...');
            await this.questionModel.insertMany(referentQuestions);
        }

        // Check doctorant questions
        const doctorantCount = await this.questionModel.countDocuments({ target: 'doctorant' });

        if (doctorantCount === 0) {
            console.log('🌱 Seeding doctorant questions (duplicating referent ones)...');
            // Duplicate referent questions but change target to 'doctorant'
            const doctorantQuestions = referentQuestions.map(q => ({
                ...q,
                target: 'doctorant'
            }));
            await this.questionModel.insertMany(doctorantQuestions);
        }

        console.log('✅ Seeding complete.');
    }

    async create(createQuestionDto: CreateQuestionDto): Promise<Question> {
        const createdQuestion = new this.questionModel(createQuestionDto);
        return createdQuestion.save();
    }

    async findAll(target?: string): Promise<Question[]> {
        const filter = target ? { target } : {};
        return this.questionModel.find(filter).sort({ order: 1 }).exec();
    }

    async findOne(id: string): Promise<Question> {
        return this.questionModel.findById(id).exec();
    }

    async update(id: string, updateQuestionDto: UpdateQuestionDto): Promise<Question> {
        return this.questionModel.findByIdAndUpdate(id, updateQuestionDto, { new: true }).exec();
    }


    async remove(id: string): Promise<Question> {
        return this.questionModel.findByIdAndDelete(id).exec();
    }

    async export(): Promise<Question[]> {
        return this.questionModel.find().sort({ order: 1 }).exec();
    }

    async import(questions: Question[], target?: string): Promise<any> {
        // 1. If target is provided, we only sync questions for that target
        // Otherwise, we sync everything (destructive for other targets)
        
        if (target) {
            // A. Delete existing questions for THIS target that are NOT in the incoming list
            const importedIds = questions.filter(q => q['_id'] && !q['_id'].startsWith('temp_')).map(q => q['_id']);
            await this.questionModel.deleteMany({ target, _id: { $nin: importedIds } });

            // B. Process each question: Insert if temp ID, Update if real ID
            const operations = questions.map(q => {
                const { _id, ...data } = q;
                if (_id && !_id.toString().startsWith('temp_')) {
                    return {
                        updateOne: {
                            filter: { _id },
                            update: { $set: data },
                            upsert: true
                        }
                    };
                } else {
                    return {
                        insertOne: {
                            document: { ...data, target } // Ensure target is correct
                        }
                    };
                }
            });

            if (operations.length > 0) {
                return this.questionModel.bulkWrite(operations);
            }
        } else {
            // Legacy behavior: Reset everything
            await this.questionModel.deleteMany({});
            return this.questionModel.insertMany(questions);
        }
        
        return { message: 'Synced empty list' };
    }
}
