import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorantModule } from './doctorant/doctorant.module';
import { EmailController } from './email/email.controller';
import { TokenModule } from './token/token.module';
import { AuthModule } from './admin/auth/auth.module';


@Module({
    imports: [
        MongooseModule.forRoot('mongodb://localhost:27017/csi-db'),
        DoctorantModule,
        TokenModule,
        AuthModule,
    ],
    controllers: [EmailController],
    providers: [],
})
export class AppModule {}