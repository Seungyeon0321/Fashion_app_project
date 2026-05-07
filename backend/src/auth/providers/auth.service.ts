import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/providers/users.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) {}

    async validateLocalUser(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user;
    }

    generateToken(user: {id: number; email: string}) {
        const payload = { sub: user.id, email: user.email };
        return {accessToken: this.jwtService.sign(payload)};
    }

    async register(email: string, password: string, nickname?: string, gender?: 'MALE' | 'FEMALE' | 'UNISEX') {
        // check if the email is already in use
        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new BadRequestException('Email already in use');
        }
        // create a new user
        const user = await this.usersService.createLocalUser(email, password, nickname, gender);
        return this.generateToken(user);
    }

    async handleGoogleLogin(profile: {
        googleId: string;
        email: string;
        nickname?: string;
        avatarUrl?: string;
      }) {
        const user = await this.usersService.findOrCreateGoogleUser(profile);
        return this.generateToken(user);
      }
}