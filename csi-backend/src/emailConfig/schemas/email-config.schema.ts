import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmailConfigDocument = EmailConfig & Document;

@Schema({ timestamps: true })
export class EmailConfig {

    /** 🆕 Ajout des groupes MECA, PP, IM, IMMUNO et GENYX */
    @Prop({ type: { recipient: [String], cc: [String] }, default: { recipient: [], cc: [] } })
    MECA: { recipient: string[]; cc: string[] };

    @Prop({ type: { recipient: [String], cc: [String] }, default: { recipient: [], cc: [] } })
    PP: { recipient: string[]; cc: string[] };

    @Prop({ type: { recipient: [String], cc: [String] }, default: { recipient: [], cc: [] } })
    IM: { recipient: string[]; cc: string[] };

    @Prop({ type: { recipient: [String], cc: [String] }, default: { recipient: [], cc: [] } })
    IMMUNO: { recipient: string[]; cc: string[] };

    @Prop({ type: { recipient: [String], cc: [String] }, default: { recipient: [], cc: [] } })
    GENYX: { recipient: string[]; cc: string[] };

    @Prop({ type: String, default: '' })
    presentationTemplate: string;

    @Prop({ type: String, default: '' })
    csiPdfExplicatif: string;

    @Prop({ type: String, default: '' })
    csiProposalLink: string;

    @Prop({ type: String, default: '' })
    contactLink: string;

    /** 🆕 Ajout des champs contenant le contenu des emails */
    @Prop({ type: String, default: '' })
    firstDoctorantEmail: string;

    @Prop({ type: String, default: '' })
    doctorantSubmit: string;

    @Prop({ type: String, default: '' })
    formCsiMember: string;

    @Prop({ type: String, default: '' })
    thanksForSubmitCsiMember: string;

    @Prop({ type: String, default: '' })
    CsiMemberHasSubmitForDoctorant: string;

    @Prop({ type: String, default: '' })
    CsiMemberHasSubmitForDirector: string;

    @Prop({ type: String, default: '' })
    finalEmail: string;

    @Prop({ default: true })
    active: boolean;
}

export const EmailConfigSchema = SchemaFactory.createForClass(EmailConfig);