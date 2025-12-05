// ============================================
// FILE: src/workers/workers.controller.ts
// ============================================
import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { SearchWorkerDto } from './dto/search-worker.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workers')
export class WorkersController {
  constructor(private workersService: WorkersService) {}

  @Get()
  findAll() {
    return this.workersService.findAll();
  }

  @Get('search')
  searchWorkers(@Query() searchDto: SearchWorkerDto) {
    return this.workersService.searchWorkers(searchDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workersService.findOne(id);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  createWorkerProfile(@Request() req, @Body('skills') skills: string[]) {
    return this.workersService.create(req.user.id, skills);
  }

  @Put(':id/location')
  @UseGuards(JwtAuthGuard)
  updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number; location: string },
  ) {
    return this.workersService.updateLocation(
      id,
      body.latitude,
      body.longitude,
      body.location,
    );
  }

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard)
  updateAvailability(@Param('id') id: string, @Body('isAvailable') isAvailable: boolean) {
    return this.workersService.updateAvailability(id, isAvailable);
  }
}
