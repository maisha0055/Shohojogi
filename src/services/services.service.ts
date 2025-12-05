// ============================================
// FILE: src/services/services.service.ts
// ============================================
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
  ) {}

  async findAll(): Promise<Service[]> {
    return this.servicesRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Service> {
    return this.servicesRepository.findOne({ where: { id } });
  }

  async seedServices() {
    const services = [
      { name: 'Carpenter', description: 'Furniture repair, wooden work, door/window installation' },
      { name: 'Electrician', description: 'Electrical repairs, wiring, appliance installation' },
      { name: 'Plumber', description: 'Pipe repairs, bathroom/kitchen fixtures, water system' },
      { name: 'Mechanic', description: 'Vehicle repairs, maintenance, diagnostics' },
      { name: 'Key Maker', description: 'Key duplication, lock repair, security systems' },
      { name: 'Painter', description: 'Interior/exterior painting, wall finishing' },
      { name: 'AC Technician', description: 'AC installation, repair, maintenance' },
      { name: 'Gardener', description: 'Lawn care, plant maintenance, landscaping' },
    ];

    for (const service of services) {
      const exists = await this.servicesRepository.findOne({
        where: { name: service.name },
      });
      if (!exists) {
        await this.servicesRepository.save(service);
      }
    }

    return { message: 'Services seeded successfully' };
  }
}
