import { Injectable, Logger } from '@nestjs/common';
import { UserSeeder } from './seeders/user.seeder';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly userSeeder: UserSeeder) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      await this.userSeeder.seed();
      this.logger.log('Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('Database seeding failed:', error.message);
      throw error;
    }
  }
}
