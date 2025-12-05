import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { JobAlertsService } from './job-alerts.service';
import { JobAlert } from './job-alert.model';

@Controller('job-alerts')
export class JobAlertsController {
  constructor(private readonly jobAlertsService: JobAlertsService) {}

  @Post()
  createAlert(
    @Body('workerId', ParseIntPipe) workerId: number,
    @Body('jobTitle') jobTitle: string,
    @Body('message') message: string,
  ): JobAlert {
    return this.jobAlertsService.createAlert(workerId, jobTitle, message);
  }

  @Get('worker/:workerId')
  getAlertsForWorker(
    @Param('workerId', ParseIntPipe) workerId: number,
  ): JobAlert[] {
    return this.jobAlertsService.getAlertsForWorker(workerId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseIntPipe) id: number): JobAlert | undefined {
    return this.jobAlertsService.markAsRead(id);
  }
}
