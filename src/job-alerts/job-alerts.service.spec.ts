import { Test, TestingModule } from '@nestjs/testing';
import { JobAlertsService } from './job-alerts.service';

describe('JobAlertsService', () => {
  let service: JobAlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobAlertsService],
    }).compile();

    service = module.get<JobAlertsService>(JobAlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
