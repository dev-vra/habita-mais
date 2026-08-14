import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CapacidadesService } from './capacidades.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, CapacidadesService, JwtStrategy],
  exports: [PasswordService, CapacidadesService],
})
export class AuthModule {}
