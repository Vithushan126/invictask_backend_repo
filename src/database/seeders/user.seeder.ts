import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    try {
      // Check if SUPER_ADMIN already exists
      const existingSuperAdmin = await this.userRepository.findOne({
        where: { email: 'admin@gmail.com' },
      });

      if (existingSuperAdmin) {
        this.logger.log('SUPER_ADMIN already exists, skipping seed');
        return;
      }

      // Create SUPER_ADMIN user
      const hashedPassword = await bcrypt.hash('admin@123', 12);

      const superAdmin = this.userRepository.create({
        email: 'admin@gmail.com',
        firstName: 'Super',
        lastName: 'Admin',
        displayName: 'Super Admin',
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null, // No verification needed for SUPER_ADMIN
        timezone: 'UTC',
        locale: 'en',
        preferences: {
          theme: 'light',
          language: 'en',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          startOfWeek: 'monday',
          notifications: {
            email: true,
            push: true,
            desktop: true,
            sound: true,
          },
          privacy: {
            showEmail: false,
            showPhone: false,
            showOnlineStatus: true,
            allowDirectMessages: true,
          },
        },
      });

      await this.userRepository.save(superAdmin);

      this.logger.log('✅ SUPER_ADMIN seeded successfully!');
      this.logger.log('📧 Email: admin@gmail.com');
      this.logger.log('🔑 Password: admin@123');
      this.logger.log('🔐 Email verification: Not required for SUPER_ADMIN');
    } catch (error) {
      this.logger.error('Failed to seed SUPER_ADMIN:', error.message);
      throw error;
    }
  }
}
