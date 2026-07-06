import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { RegisterService } from './register.service';
import { RegisterDto } from './dto/register.dto';

@Controller('register')
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  @Public()
  @Post()
  @HttpCode(201)
  register(@Body() dto: RegisterDto) {
    return this.registerService.register(dto);
  }
}
