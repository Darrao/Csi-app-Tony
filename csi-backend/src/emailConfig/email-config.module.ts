import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailConfigService } from './email-config.service';
import { EmailConfigController } from './email-config.controller';
import { EmailConfig, EmailConfigSchema } from './schemas/email-config.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: EmailConfig.name, schema: EmailConfigSchema }]),
    ],
    controllers: [EmailConfigController],
    providers: [EmailConfigService],
    exports: [EmailConfigService], // Permet d'utiliser le service dans d'autres modules
})
export class EmailConfigModule {}