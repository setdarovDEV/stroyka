import { Module } from '@nestjs/common';
import { MachineLogsService } from './machine-logs.service';
import { MachineLogsController } from './machine-logs.controller';

@Module({
  providers: [MachineLogsService],
  controllers: [MachineLogsController],
})
export class MachineLogsModule {}
