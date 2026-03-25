
import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateQuestionDto {
    @IsEnum(['doctorant', 'referent'])
    target: string;

    @IsString()
    content: string;

    @IsString()
    section: string;

    @IsEnum(['text', 'scale_1_5', 'rating_comment', 'plus_minus_comment', 'select', 'system', 'chapter_title', 'description', 'multiple_choice'])
    type: string;

    @IsOptional()
    @IsString({ each: true })
    options?: string[];

    @IsOptional()
    @IsBoolean()
    allowMultipleSelection?: boolean;

    @IsNumber()
    order: number;

    @IsBoolean()
    @IsOptional()
    active?: boolean;

    @IsBoolean()
    @IsOptional()
    required?: boolean;

    @IsBoolean()
    @IsOptional()
    visibleToReferent?: boolean;

    @IsBoolean()
    @IsOptional()
    visibleInPdf?: boolean;

    @IsString()
    @IsOptional()
    helpText?: string;

    @IsString()
    @IsOptional()
    placeholder?: string;

    @IsString()
    @IsOptional()
    systemId?: string;

    @IsOptional()
    options?: string[];

    @IsBoolean()
    @IsOptional()
    allowMultipleSelection?: boolean;
}
