import { Injectable, NestMiddleware } from '@nestjs/common';
import { DoctorantService } from './doctorant.service';

@Injectable()
export class DoctorantMiddleware implements NestMiddleware {
    constructor(private readonly doctorantService: DoctorantService) {}

    use(req: any, res: any, next: () => void) {
        req.doctorantService = this.doctorantService;
        next();
    }
}