import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  status() {
    return { status: 'ok', servico: 'habita-api' };
  }
}
