
// ============================================
// FILE: src/services/services.controller.ts
// ============================================
import { Controller, Get, Post, Param } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Post('seed')
  seedServices() {
    return this.servicesService.seedServices();
  }
}