import { Module } from '@nestjs/common';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialRequestsController } from './material-requests.controller';

@Module({
  providers: [MaterialRequestsService],
  controllers: [MaterialRequestsController],
})
export class MaterialRequestsModule {}
