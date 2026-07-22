import { Module } from '@nestjs/common';
import { EstimateLinesService } from './estimate-lines.service';
import { EstimateLinesController } from './estimate-lines.controller';

@Module({
  providers: [EstimateLinesService],
  controllers: [EstimateLinesController],
})
export class EstimateLinesModule {}
