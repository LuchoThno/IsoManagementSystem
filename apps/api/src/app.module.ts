import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IsoModule } from './iso/iso.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/iso_manager'
    ),
    IsoModule,
  ],
})
export class AppModule {}
