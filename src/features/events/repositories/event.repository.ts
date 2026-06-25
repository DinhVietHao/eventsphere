import { IEvent, Event } from "../models/event.model";

export class EventRepository {

    // UC01 - Danh sách event công khai, có phân trang
    async findPublished(page: number, limit: number): Promise<IEvent[]> {
        const skip = (page - 1) * limit;
        return Event.find({ status: 'APPROVED' })
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(limit);
    }

    // UC02 - Chi tiết 1 event
    async findById(id: string): Promise<IEvent | null> {
        return Event.findById(id);
    }

    // UC03 - Tìm kiếm full-text
    async search(keyword: string): Promise<IEvent[]> {
        return Event.find({
            $text: { $search: keyword },
            status: 'APPROVED',
        })
    }

    // UC04 - Lọc theo category và/hoặc khoảng thời gian
    async findWithFilters(filters: {
        category ?: string;
        startFrom?: Date;
        startTo  ?: Date;
    }): Promise<IEvent[]> {
        const query: Record<string, unknown> = { status: 'APPROVED' };

        if (filters.category) {
            query.category = filters.category;
        }
        if (filters.startFrom || filters.startTo) {
            query.startDate = {
                ...(filters.startFrom && { $gte: filters.startFrom }),
                ...(filters.startTo && {$lte: filters.startTo}),
            }
        }

        return Event.find(query).sort({ startDate: 1 });
    }
}