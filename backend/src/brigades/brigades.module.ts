import { Module } from '@nestjs/common';
import { BrigadesService } from './brigades.service';
import { BrigadesController } from './brigades.controller';

@Module({
  providers: [BrigadesService],
  controllers: [BrigadesController],
})
export class BrigadesModule {}
