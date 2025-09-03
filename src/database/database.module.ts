import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeeder } from './seeders/user.seeder';

// Import entities for seeding
import { User } from '../entities/user.entity';
import { SeederService } from './seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, // Only User entity needed for seeding SUPER_ADMIN
    ]),
  ],
  providers: [UserSeeder, SeederService],
  exports: [SeederService],
})
export class DatabaseModule {}
