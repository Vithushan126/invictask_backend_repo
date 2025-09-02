import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import {
  Organization,
  OrganizationMember,
  OrganizationRole,
} from '../../entities/organization.entity';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '../../entities/workspace.entity';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private readonly organizationMemberRepository: Repository<OrganizationMember>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
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

      const savedSuperAdmin = await this.userRepository.save(superAdmin);

      this.logger.log('✅ SUPER_ADMIN seeded successfully!');
      this.logger.log('📧 Email: admin@gmail.com');
      this.logger.log('🔑 Password: admin@123');
    } catch (error) {
      this.logger.error('Failed to seed SUPER_ADMIN:', error.message);
      throw error;
    }
  }
}
