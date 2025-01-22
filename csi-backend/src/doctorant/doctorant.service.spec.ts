import { Test, TestingModule } from '@nestjs/testing';
import { DoctorantService } from './doctorant.service';

describe('DoctorantService', () => {
  let service: DoctorantService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DoctorantService],
    }).compile();

    service = module.get<DoctorantService>(DoctorantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
