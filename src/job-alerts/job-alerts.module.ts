import { Module } from '@nestjs/common';
import { JobAlertsService } from './job-alerts.service';
import { JobAlertsController } from './job-alerts.controller';

@Module({
  providers: [JobAlertsService],
  controllers: [JobAlertsController]
})
export class JobAlertsModule {}
