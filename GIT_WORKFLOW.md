# 🌿 EventSphere — Git Workflow & Commit Guidelines

> **Áp dụng cho:** Toàn bộ thành viên — Hào, Lượng, Kha, Trọng, Danh  
> **Nhánh gốc:** `develop`

---

## 📋 Mục lục

1. [Quy trình làm việc hàng ngày](#1-quy-trình-làm-việc-hàng-ngày)
2. [Bản đồ nhánh & phân công](#2-bản-đồ-nhánh--phân-công)
3. [Quy tắc đặt tên commit](#3-quy-tắc-đặt-tên-commit)
4. [Prompt AI soạn commit](#4-prompt-ai-soạn-commit)
5. [Quy trình tạo Pull Request](#5-quy-trình-tạo-pull-request)
6. [Các lỗi thường gặp & cách xử lý](#6-các-lỗi-thường-gặp--cách-xử-lý)

---

## 1. Quy trình làm việc hàng ngày

Mỗi ngày bắt đầu code, thực hiện đúng thứ tự sau:

```
① Cập nhật develop mới nhất
② Chuyển sang nhánh UC của mình
③ Viết code (đúng 3 tầng: Controller → Service → Repository)
④ Dùng Prompt AI để soạn commit message chuẩn
⑤ Push & tạo Pull Request về develop
```

### Bước 1 — Đồng bộ code mới nhất từ develop

> **Làm mỗi buổi sáng trước khi code**, tránh conflict với code của thành viên khác vừa merge.

```bash
git checkout develop
git pull origin develop
```

### Bước 2 — Chuyển sang nhánh UC của mình

```bash
# Ví dụ: Hào làm auth
git checkout feat/uc05-06-auth-core

# Merge code mới nhất từ develop vào nhánh của mình
git merge develop
```

> **Tại sao phải merge develop vào nhánh mình?**  
> Giả sử Kha vừa merge xong `feat/uc07-tickets-register` vào develop. Nếu bạn không merge develop vào nhánh mình, khi tạo PR sau này sẽ bị conflict với code của Kha.

### Bước 3 — Viết code

Tuân thủ đúng kiến trúc 3 tầng. Xem chi tiết tại `BE_PROJECT-RULES.md`.

### Bước 4 — Soạn commit bằng Prompt AI

Xem hướng dẫn chi tiết tại [Mục 4](#4-prompt-ai-soạn-commit).

### Bước 5 — Push và tạo Pull Request

```bash
git add .
git commit -m "<commit message từ AI>"
git push origin <tên-nhánh-của-bạn>
```

Sau đó lên GitHub tạo PR. Xem chi tiết tại [Mục 5](#5-quy-trình-tạo-pull-request).

---

## 2. Bản đồ nhánh & phân công

> Mỗi nhánh tương ứng với một nhóm Use Case. **Không code lẫn UC của nhánh khác.**

| Nhánh | Use Cases | Người phụ trách |
|---|---|---|
| `feat/uc01-04-events-browse` | UC01 Xem danh sách · UC02 Chi tiết · UC03 Tìm kiếm · UC04 Lọc | Hào · Lượng · Trọng |
| `feat/uc05-06-auth-core` | UC05 Đăng ký · UC06 Đăng nhập | **Hào** |
| `feat/uc07-tickets-register` | UC07 Đăng ký tham dự + trừ quota nguyên tử | **Kha** |
| `feat/uc08-tickets-payment` | UC08 Thanh toán VNPay/Stripe + Webhook | **Kha** |
| `feat/uc09-10-tickets-details-calendar` | UC09 Xem vé QR · UC10 Đồng bộ Google Calendar | **Kha** |
| `feat/uc11-reviews-event` | UC11 Đánh giá & chấm điểm sự kiện | Core team |
| `feat/uc12-tickets-history` | UC12 Lịch sử tham dự | **Kha** |
| `feat/uc13-events-manage` | UC13 CRUD sự kiện + Upload banner Cloudinary | **Hào** |
| `feat/uc14-events-ticket-types` | UC14 Cấu hình hạng vé VIP/General + Quota | **Lượng** |
| `feat/uc15-events-registration-list` | UC15 Danh sách đăng ký của Organizer | **Lượng** |
| `feat/uc16-notifications-mass-send` | UC16 Bull Queue gửi email/FCM hàng loạt | **Danh** |
| `feat/uc17-events-manage-staff` | UC17 Phân công Staff vào sự kiện | **Trọng** |
| `feat/uc18-events-export-csv` | UC18 Xuất danh sách attendee ra CSV | **Lượng** |
| `feat/uc19-20-events-report-dashboard` | UC19 Báo cáo tổng kết · UC20 Dashboard Realtime | Danh · Trọng |
| `feat/uc21-22-checkin-qr-manual` | UC21 Quét QR check-in · UC22 Check-in thủ công | **Trọng** |
| `feat/uc23-admin-approve-event` | UC23 Admin phê duyệt / từ chối sự kiện | **Hào** |
| `feat/uc24-admin-manage-accounts` | UC24 Quản lý tài khoản, khóa/mở, đổi role | Core team |
| `feat/uc25-26-admin-analytics` | UC25 Dashboard hệ thống · UC26 Báo cáo doanh thu | Danh · Trọng |

---

## 3. Quy tắc đặt tên commit

Mọi commit phải tuân theo format **Conventional Commits**:

```
<type>: <mô tả ngắn gọn, tiếng Anh, động từ nguyên thể>
```

### Các loại `type` được dùng

| Type | Dùng khi nào | Ví dụ |
|---|---|---|
| `feat` | Thêm tính năng mới | `feat: add JWT refresh token rotation` |
| `fix` | Sửa bug | `fix: prevent duplicate check-in on retry` |
| `refactor` | Cải thiện code, không thêm tính năng | `refactor: move quota check to repository layer` |
| `test` | Thêm/sửa test | `test: add unit tests for AuthService.login` |
| `docs` | Cập nhật tài liệu | `docs: update CONTEXT.md for auth feature` |
| `chore` | Cài thư viện, config, CI/CD | `chore: install bull and ioredis dependencies` |

### Ví dụ commit đầy đủ (có body)

```
feat: implement attendance registration with atomic quota check (UC07)

- Add POST /registrations endpoint in tickets.router.ts
- Implement atomic $inc with conditional filter to prevent race conditions
- Throw TKT_004 AppError when sold >= quota
- Invalidate ticket_types cache after successful registration
- Add RegisterDto Joi schema validation in tickets.dto.ts
```

> **Quy tắc viết body:**
> - Mỗi dòng bắt đầu bằng dấu `-`
> - Dùng động từ mệnh lệnh: `Add`, `Implement`, `Fix`, `Remove`, `Update`
> - Không viết "I added..." hay "Added..." — viết "Add..."

---

## 4. Prompt AI soạn commit

Khi hoàn thành code, dùng prompt dưới đây để AI soạn commit message chuẩn. **Điền vào 4 placeholder được đánh dấu `[ ]`.**

---

### 📋 Prompt Template (copy nguyên, điền placeholder)

```
You are a Git expert. Generate a professional commit message for the following code changes.

**Context:**
- Project: EventSphere — Event Management & QR Check-in System
- Architecture: 3-Layer (Controller → Service → Repository), Node.js + Express + TypeScript
- Branch: [TÊN NHÁNH — ví dụ: feat/uc07-tickets-register]
- Use Cases completed: [MÃ VÀ TÊN UC — ví dụ: UC07 - Attendance registration with atomic quota check]

**Commit title (use exactly this):**
[TIÊU ĐỀ COMMIT — copy từ bảng bên dưới]

**Rules for the body:**
- Bullet list starting with `-`
- Imperative verbs: Add, Implement, Fix, Remove, Update, Validate, Emit, Queue
- Mention key files/functions touched: router, controller, service, repository, dto, model
- Highlight architectural decisions (e.g. atomic $inc, AppError code, cache invalidation, socket emit)
- Max 6 bullet points

**My code:**
[DÁN TOÀN BỘ CODE VÀO ĐÂY]
```

---

### 🗂️ Bảng tiêu đề commit cho từng nhánh

Khi dùng prompt, copy tiêu đề tương ứng điền vào placeholder `[TIÊU ĐỀ COMMIT]`:

| Nhánh | Tiêu đề commit (copy nguyên) |
|---|---|
| `feat/uc01-04-events-browse` | `feat: implement public event browsing and search capabilities (UC01-04)` |
| `feat/uc05-06-auth-core` | `feat: implement user registration and login with JWT authentication (UC05-06)` |
| `feat/uc07-tickets-register` | `feat: implement attendance registration with atomic quota check (UC07)` |
| `feat/uc08-tickets-payment` | `feat: integrate payment gateway and webhook handler for ticket issuance (UC08)` |
| `feat/uc09-10-tickets-details-calendar` | `feat: implement ticket detail view and Google Calendar sync (UC09-10)` |
| `feat/uc11-reviews-event` | `feat: implement event review system with auto-recalculated average rating (UC11)` |
| `feat/uc12-tickets-history` | `feat: implement paginated attendance history for attendees (UC12)` |
| `feat/uc13-events-manage` | `feat: implement event lifecycle management with cloud image upload (UC13)` |
| `feat/uc14-events-ticket-types` | `feat: implement ticket tier configuration and quota management (UC14)` |
| `feat/uc15-events-registration-list` | `feat: implement filtered registration list for organizers (UC15)` |
| `feat/uc16-notifications-mass-send` | `feat: implement async mass notifications via Bull queue (UC16)` |
| `feat/uc17-events-manage-staff` | `feat: implement staff assignment management for events (UC17)` |
| `feat/uc18-events-export-csv` | `feat: implement attendee list export to CSV format (UC18)` |
| `feat/uc19-20-events-report-dashboard` | `feat: implement event analytics report and realtime dashboard (UC19-20)` |
| `feat/uc21-22-checkin-qr-manual` | `feat: implement QR scan and manual attendee check-in (UC21-22)` |
| `feat/uc23-admin-approve-event` | `feat: implement admin event approval and rejection workflow (UC23)` |
| `feat/uc24-admin-manage-accounts` | `feat: implement admin user management and account status control (UC24)` |
| `feat/uc25-26-admin-analytics` | `feat: implement platform-wide admin dashboard and revenue reports (UC25-26)` |

---

### 💡 Ví dụ prompt đã điền đầy đủ

```
You are a Git expert. Generate a professional commit message for the following code changes.

**Context:**
- Project: EventSphere — Event Management & QR Check-in System
- Architecture: 3-Layer (Controller → Service → Repository), Node.js + Express + TypeScript
- Branch: feat/uc05-06-auth-core
- Use Cases completed: UC05 - User registration, UC06 - Login with JWT + refresh token

**Commit title (use exactly this):**
feat: implement user registration and login with JWT authentication (UC05-06)

**Rules for the body:**
- Bullet list starting with `-`
- Imperative verbs: Add, Implement, Fix, Remove, Update, Validate, Emit, Queue
- Mention key files/functions touched: router, controller, service, repository, dto, model
- Highlight architectural decisions (e.g. atomic $inc, AppError code, cache invalidation, socket emit)
- Max 6 bullet points

**My code:**
// auth.service.ts
async register(dto: RegisterDto) { ... }
async login(dto: LoginDto) { ... }
// ... (toàn bộ code của bạn)
```

**Kết quả AI trả về:**

```
feat: implement user registration and login with JWT authentication (UC05-06)

- Add RegisterDto and LoginDto Joi schemas with email format and min-length validation
- Implement bcrypt password hashing in AuthService.register before persistence
- Add UserRepository.findByEmail with select('+passwordHash') for secure lookup
- Issue access token (15m) and refresh token (7d) on successful login
- Persist hashed refresh token via TokenRepository.save to refresh_tokens collection
- Throw AUTH_005 AppError on duplicate email, AUTH_001 on invalid credentials
```

---

## 5. Quy trình tạo Pull Request

### Checklist bắt buộc trước khi tạo PR

```bash
# 1. Kiểm tra TypeScript không có lỗi
npx tsc --noEmit

# 2. Chạy toàn bộ test
npm test

# 3. Đảm bảo không commit file .env
git status   # Không thấy .env trong danh sách
```

Nếu cả 3 lệnh trên đều pass → tạo PR.

### Cách tạo PR trên GitHub

```
Title:   [UC05-06] Implement user registration and login
Base:    develop          ← merge VỀ đây
Compare: feat/uc05-06-auth-core   ← nhánh của bạn
```

**Mô tả PR (điền vào):**

```markdown
## Các thay đổi chính
- Mô tả ngắn gọn những gì đã làm

## Use Cases
- [x] UC05 — Đăng ký tài khoản
- [x] UC06 — Đăng nhập

## Checklist
- [ ] Không có TypeScript errors (`tsc --noEmit`)
- [ ] Passes all tests (`npm test`)
- [ ] Không commit file `.env`
- [ ] Đã cập nhật `CONTEXT.md` nếu thay đổi feature
```

### Quy tắc merge

- PR cần **ít nhất 1 thành viên khác review** trước khi merge
- Chỉ **Trưởng nhóm** merge PR vào `develop`
- **Không tự merge PR của chính mình**

---

## 6. Các lỗi thường gặp & cách xử lý

### Lỗi 1 — Bị conflict khi merge develop vào nhánh

```bash
# Xảy ra khi: bạn và thành viên khác cùng sửa 1 file
git merge develop
# → CONFLICT (content): Merge conflict in src/features/auth/auth.service.ts

# Cách xử lý:
# 1. Mở file bị conflict, tìm đoạn <<<<<<< HEAD
# 2. Giữ lại code đúng, xóa các marker <<<, ===, >>>
# 3. Sau khi sửa xong:
git add .
git commit -m "chore: resolve merge conflict with develop"
```

### Lỗi 2 — Push bị rejected vì nhánh remote đã có commit mới hơn

```bash
git push origin feat/uc05-06-auth-core
# → rejected: Updates were rejected because the remote contains work you do not have

# Cách xử lý:
git pull origin feat/uc05-06-auth-core --rebase
git push origin feat/uc05-06-auth-core
```

### Lỗi 3 — Lỡ commit vào sai nhánh

```bash
# Ví dụ: lỡ commit vào develop thay vì feat/uc05-06-auth-core
# Bước 1: Lấy commit hash vừa commit sai
git log --oneline -3

# Bước 2: Chuyển sang nhánh đúng và cherry-pick commit đó
git checkout feat/uc05-06-auth-core
git cherry-pick <commit-hash>

# Bước 3: Xóa commit sai ở nhánh cũ
git checkout develop
git reset --hard HEAD~1   # Lùi 1 commit, KHÔNG dùng nếu đã push lên remote!
```

### Lỗi 4 — Lỡ commit file `.env`

```bash
# Xóa file .env khỏi Git tracking (không xóa file thật)
git rm --cached .env

# Thêm .env vào .gitignore nếu chưa có
echo ".env" >> .gitignore

git add .gitignore
git commit -m "chore: remove .env from tracking and update gitignore"
```

> ⚠️ Nếu đã push `.env` lên remote — báo ngay cho Trưởng nhóm để rotate toàn bộ secrets trong file đó.

### Lỗi 5 — Muốn sửa commit message vừa commit (chưa push)

```bash
git commit --amend -m "feat: correct commit message here"
# Chỉ dùng khi CHƯA push lên remote
```

---

*EventSphere Backend Team · 2025*
