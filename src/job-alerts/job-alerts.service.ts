import { Injectable } from '@nestjs/common';
import { JobAlert } from './job-alert.model';

@Injectable()
export class JobAlertsService {
  private alerts: JobAlert[] = [];
  private nextId = 1;

  createAlert(
    workerId: number,
    jobTitle: string,
    message: string,
  ): JobAlert {
    const alert: JobAlert = {
      id: this.nextId++,
      workerId,
      jobTitle,
      message,
      isRead: false,
      createdAt: new Date(),
    };
    this.alerts.push(alert);
    return alert;
  }

  getAlertsForWorker(workerId: number): JobAlert[] {
    return this.alerts.filter((a) => a.workerId === workerId);
  }

  markAsRead(alertId: number): JobAlert | undefined {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.isRead = true;
    }
    return alert;
  }
}
