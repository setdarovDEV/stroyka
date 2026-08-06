import { Module } from '@nestjs/common';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';
import { SmetaParserService } from './smeta-parser.service';
import { SmetaQueueService } from './smeta-queue.service';
import { SmetaWorker } from './smeta-worker';

@Module({
  providers: [EstimatesService, SmetaParserService, SmetaQueueService, SmetaWorker],
  controllers: [EstimatesController],
})
export class EstimatesModule {}
