import { Test, TestingModule } from '@nestjs/testing';
import { DoctorantController } from './doctorant.controller';

describe('DoctorantController', () => {
  let controller: DoctorantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorantController],
    }).compile();

    controller = module.get<DoctorantController>(DoctorantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
