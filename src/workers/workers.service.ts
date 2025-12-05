// ============================================
// FILE: src/workers/workers.service.ts
// ============================================
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Worker } from './entities/worker.entity';
import { SearchWorkerDto } from './dto/search-worker.dto';

@Injectable()
export class WorkersService {
  constructor(
    @InjectRepository(Worker)
    private workersRepository: Repository<Worker>,
  ) {}

  async create(userId: string, skills: string[]): Promise<Worker> {
    const worker = this.workersRepository.create({
      userId,
      skills,
    });
    return this.workersRepository.save(worker);
  }

  async findAll(): Promise<Worker[]> {
    return this.workersRepository.find({
      relations: ['user'],
      order: { rating: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Worker> {
    const worker = await this.workersRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }
    
    return worker;
  }

  async searchWorkers(searchDto: SearchWorkerDto): Promise<Worker[]> {
    const query = this.workersRepository
      .createQueryBuilder('worker')
      .leftJoinAndSelect('worker.user', 'user')
      .where('worker.isAvailable = :available', { available: true });

    // Filter by skills
    if (searchDto.skills && searchDto.skills.length > 0) {
      query.andWhere('worker.skills && ARRAY[:...skills]', { skills: searchDto.skills });
    }

    // Filter by location (text search)
    if (searchDto.location) {
      query.andWhere('LOWER(worker.location) LIKE LOWER(:location)', {
        location: `%${searchDto.location}%`,
      });
    }

    // Filter by rating
    if (searchDto.minRating) {
      query.andWhere('worker.rating >= :minRating', { minRating: searchDto.minRating });
    }

    // Filter by proximity (if latitude and longitude provided)
    if (searchDto.latitude && searchDto.longitude) {
      const radius = searchDto.radius || 10; // Default 10km radius
      
      // Haversine formula for distance calculation
      query.andWhere(
        `(
          6371 * acos(
            cos(radians(:lat)) * cos(radians(worker.latitude)) *
            cos(radians(worker.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(worker.latitude))
          )
        ) <= :radius`,
        {
          lat: searchDto.latitude,
          lng: searchDto.longitude,
          radius: radius,
        },
      );
    }

    query.orderBy('worker.rating', 'DESC');

    return query.getMany();
  }

  async findByUserId(userId: string): Promise<Worker> {
    return this.workersRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async updateLocation(
    workerId: string,
    latitude: number,
    longitude: number,
    location: string,
  ): Promise<Worker> {
    const worker = await this.findOne(workerId);
    worker.latitude = latitude;
    worker.longitude = longitude;
    worker.location = location;
    return this.workersRepository.save(worker);
  }

  async updateAvailability(workerId: string, isAvailable: boolean): Promise<Worker> {
    const worker = await this.findOne(workerId);
    worker.isAvailable = isAvailable;
    return this.workersRepository.save(worker);
  }
}