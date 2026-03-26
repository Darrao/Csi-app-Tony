import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorantDto } from './create-doctorant.dto';
import { IsEmail, IsOptional } from 'class-validator';

export class UpdateDoctorantDto extends PartialType(CreateDoctorantDto) {
  @IsOptional()
  @IsEmail()
  email?: string;
}
