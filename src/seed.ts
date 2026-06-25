import mongoose from 'mongoose';
import { Event } from './features/events/models/event.model';

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/eventsphere');

  await Event.insertMany([
    {
      title      : 'Đêm nhạc acoustic Sài Gòn',
      description: 'Buổi biểu diễn acoustic với các nghệ sĩ trẻ tài năng',
      category   : 'music',
      location   : 'Hồ Chí Minh',
      startDate  : new Date('2025-08-01'),
      endDate    : new Date('2025-08-01'),
      status     : 'APPROVED',
      organizerId: new mongoose.Types.ObjectId(),
    },
    {
      title      : 'Tech Summit 2025',
      description: 'Hội nghị công nghệ lớn nhất năm với các diễn giả hàng đầu',
      category   : 'tech',
      location   : 'Hà Nội',
      startDate  : new Date('2025-09-15'),
      endDate    : new Date('2025-09-16'),
      status     : 'APPROVED',
      organizerId: new mongoose.Types.ObjectId(),
    },
    {
      title      : 'Marathon Cần Thơ 2025',
      description: 'Giải chạy bộ quốc tế tại thành phố Cần Thơ',
      category   : 'sport',
      location   : 'Cần Thơ',
      startDate  : new Date('2025-10-20'),
      endDate    : new Date('2025-10-20'),
      status     : 'APPROVED',
      organizerId: new mongoose.Types.ObjectId(),
    },
  ]);

  console.log('✅ Seed thành công!');
  await mongoose.disconnect();
}

seed();