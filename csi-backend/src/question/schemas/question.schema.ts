
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuestionDocument = Question & Document;

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true, enum: ['doctorant', 'referent'] })
  target: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  section: string;

  @Prop({ required: true, enum: ['text', 'scale_1_5', 'rating_comment', 'plus_minus_comment', 'select', 'system', 'chapter_title', 'description'] })
  type: string;

  @Prop({ required: true })
  order: number;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: false })
  required: boolean;

  @Prop({ required: false })
  helpText: string;

  @Prop({ required: false })
  placeholder: string;

  @Prop({ required: false, unique: false }) // not strictly unique in schema to avoid collisions on empty, but logic should handle it
  systemId: string;

  @Prop({ default: false })
  visibleToReferent: boolean;

  @Prop({ default: true }) // ✅ Default true pour inclure par défaut dans le PDF
  visibleInPdf: boolean;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
