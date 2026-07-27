import { Module } from '@nestjs/common';
import { EstimatesService } from './estimates.service';
import { EstimatesController } from './estimates.controller';
import { SmetaParserService } from './smeta-parser.service';

@Module({
  providers: [EstimatesService, SmetaParserService],
  controllers: [EstimatesController],
})
export class EstimatesModule {}
