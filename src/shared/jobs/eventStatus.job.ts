import { EventService } from "../../features/events/events.service";
import { getIO } from "../../config/socket";

const eventService = new EventService();
const SCAN_INTERVAL_MS = 60 * 1000; // quét 1 phút/lần

async function runScan(): Promise<void> {
  try {
    const { started, ended, cancelled } = await eventService.autoUpdateEventStatuses();

    if (started.length === 0 && ended.length === 0 && cancelled.length === 0) {
      return;
    }

    const io = getIO();
    // Broadcast cho mọi client đang kết nối (trang danh sách organizer/admin
    // không join theo room riêng từng event) — payload đồng nhất { eventId, status }.
    const broadcast = (eventIds: string[], status: string) => {
      for (const eventId of eventIds) {
        io.emit("event_status_update", { eventId, status });
      }
    };

    if (started.length > 0) broadcast(started, "ONGOING");
    if (ended.length > 0) broadcast(ended, "ENDED");
    if (cancelled.length > 0) broadcast(cancelled, "CANCELLED");

    console.log(
      `[EventStatusJob] started=${started.length} ended=${ended.length} cancelled=${cancelled.length}`,
    );
  } catch (err) {
    console.error("[EventStatusJob] Lỗi khi quét trạng thái event:", err);
  }
}

// Quét ngay khi khởi động rồi lặp lại mỗi SCAN_INTERVAL_MS
export function startEventStatusScheduler(): void {
  runScan();
  setInterval(runScan, SCAN_INTERVAL_MS);
  console.log("[EventStatusJob] Scheduler đã khởi động (quét mỗi 60s)");
}
