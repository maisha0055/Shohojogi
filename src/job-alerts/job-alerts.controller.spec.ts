import { Test, TestingModule } from '@nestjs/testing';
import { JobAlertsController } from './job-alerts.controller';

describe('JobAlertsController', () => {
  let controller: JobAlertsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobAlertsController],
    }).compile();

    controller = module.get<JobAlertsController>(JobAlertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
