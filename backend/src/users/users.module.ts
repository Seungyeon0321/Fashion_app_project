import { Module } from '@nestjs/common';
import { UsersService } from './providers/users.service.js';

@Module({
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}