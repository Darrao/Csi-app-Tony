
import { Controller, Get, Post, Body, Put, Param, Delete, Query } from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Controller('questions')
export class QuestionController {
    constructor(private readonly questionService: QuestionService) { }

    @Post()
    async create(@Body() createQuestionDto: CreateQuestionDto) {
        try {
            return await this.questionService.create(createQuestionDto);
        } catch (error) {
            console.error("❌ ERROR CREATING QUESTION:", error);
            throw error;
        }
    }

    @Get('export')
    async export() {
        return this.questionService.export();
    }

    @Post('import')
    async import(@Body() questions: any[], @Query('target') target?: string) { 
        return this.questionService.import(questions, target);
    }

    @Get()
    findAll(@Query('target') target?: string) {
        return this.questionService.findAll(target);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.questionService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateQuestionDto: UpdateQuestionDto) {
        return this.questionService.update(id, updateQuestionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.questionService.remove(id);
    }
}
