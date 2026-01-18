import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorantDto } from './create-doctorant.dto';

export class UpdateDoctorantDto extends PartialType(CreateDoctorantDto) { }
