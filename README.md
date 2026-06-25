# 🌐 EventSphere — Backend Core Systems

> **Dự án:** Hệ thống Quản lý Sự kiện Toàn diện & Check-in qua mã QR  
> **Kiến trúc:** Feature-Driven Monolith · 3 Tầng (Controller → Service → Repository)  
> **Công nghệ:** Node.js 22 LTS · Express.js · TypeScript (Strict Mode) · MongoDB + Mongoose

---

## 📋 Mục lục

1. [Giới thiệu dự án cho người mới bắt đầu](#1-giới-thiệu-dự-án-cho-người-mới-bắt-đầu)
2. [Sơ đồ kiến trúc & luồng dữ liệu](#2-sơ-đồ-kiến-trúc--luồng-dữ-liệu)
3. [Cấu trúc thư mục thực tế](#3-cấu-trúc-thư-mục-thực-tế)
4. [Ý nghĩa từng tầng & từng file](#4-ý-nghĩa-từng-tầng--từng-file)
5. [Giải thích các khái niệm cốt lõi](#5-giải-thích-các-khái-niệm-cốt-lõi)
6. [Danh sách Use Cases & phân công](#6-danh-sách-use-cases--phân-công)
7. [Quản lý thư viện](#7-quản-lý-thư-viện)
8. [Hướng dẫn khởi động dự án](#8-hướng-dẫn-khởi-động-dự-án)
9. [Hướng dẫn sử dụng Middleware phân quyền](#9-hướng-dẫn-sử-dụng-middleware-phân-quyền)
10. [Tiến độ phát triển](#10-tiến-độ-phát-triển)

---

## 1. Giới thiệu dự án cho người mới bắt đầu

Chào mừng bạn đến với **EventSphere**! Đây là hệ thống backend hoàn chỉnh để quản lý sự kiện, bán vé, thanh toán và check-in qua mã QR.

Nếu bạn mới học Node.js + Express + MongoDB, đây là dự án lý tưởng để học cách viết code **sạch, có tổ chức và có thể mở rộng** theo đúng chuẩn thực tế của ngành.

### Ba công nghệ nền tảng bạn cần hiểu trước

**Express.js** là framework chạy trên Node.js. Nó lắng nghe các request HTTP từ client (app mobile, trình duyệt), điều hướng chúng đến đúng hàm xử lý, rồi trả response về.

```
Client gửi:  POST /api/v1/auth/login  →  Express nhận  →  Gọi hàm xử lý  →  Trả JSON về
```

**MongoDB** là cơ sở dữ liệu NoSQL. Dữ liệu được lưu dưới dạng **document** (giống JSON), không phải bảng hàng-cột như SQL. Mỗi document là một object linh hoạt.

```json
// Một document trong collection "users"
{
  "_id": "6627f3e2a1b2c3d4e5f60001",
  "name": "Nguyen Van A",
  "email": "a@gmail.com",
  "role": "attendee",
  "createdAt": "2025-01-15T08:00:00Z"
}
```

**Mongoose** là thư viện ODM (Object Data Modeling) — cầu nối giữa TypeScript và MongoDB. Thay vì viết lệnh MongoDB thuần, bạn định nghĩa **Schema** (cấu trúc dữ liệu) và Mongoose lo phần còn lại: kiểm tra dữ liệu trước khi lưu, tạo index, cung cấp các hàm tìm kiếm tiện lợi.

```ts
// Không có Mongoose — viết MongoDB thuần (cồng kềnh)
db.collection('users').findOne({ email: 'a@gmail.com' });

// Có Mongoose — gọn, có kiểu TypeScript
const user = await User.findOne({ email: 'a@gmail.com' });
```

---

## 2. Sơ đồ kiến trúc & luồng dữ liệu

### 2.1 Sơ đồ tổng quan hệ thống

```
📱 Mobile App (React Native)
        │
        │  HTTP Request  (POST /api/v1/auth/login)
        ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                 │
│                                                         │
│  ① ROUTER          → Nhận request, gắn middleware       │
│       │                                                 │
│  ② MIDDLEWARE      → Kiểm tra JWT, phân quyền Role      │
│       │                                                 │
│  ③ CONTROLLER      → Validate dữ liệu đầu vào (DTO/Joi) │
│       │                                                 │
│  ④ SERVICE         → Xử lý logic nghiệp vụ              │
│       │                                                 │
│  ⑤ REPOSITORY      → Truy vấn MongoDB qua Mongoose      │
│                                                         │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
                    🍃 MongoDB Database
```

**Nguyên tắc quan trọng:** Dữ liệu chỉ đi theo **một chiều duy nhất** (từ trên xuống). Controller không được gọi thẳng xuống Repository. Service không được trả response về client. Mỗi tầng chỉ biết tầng ngay bên dưới nó.

### 2.2 Luồng dữ liệu chi tiết — Ví dụ: Đăng nhập (UC06)

```
① Client gửi:
   POST /api/v1/auth/login
   Body: { "email": "a@gmail.com", "password": "123456" }

② Router nhận request:
   authRouter.post('/login', authController.login)
   → Không có middleware ở đây vì đây là endpoint công khai

③ Controller xử lý:
   - Lấy { email, password } từ req.body
   - Gọi Joi Schema (LoginDto) để kiểm tra:
       email có đúng định dạng không? ✓
       password có đủ 6 ký tự không? ✓
   - Nếu dữ liệu hợp lệ → gọi authService.login()
   - Nếu dữ liệu lỗi → trả lỗi 400 ngay, không đi tiếp

④ Service xử lý logic:
   - Gọi userRepository.findByEmail(email) để lấy user
   - Kiểm tra user có tồn tại không?
   - Gọi bcrypt.compare(password, user.passwordHash) để so mật khẩu
   - Kiểm tra user.isActive có bị khóa không?
   - Kiểm tra user.emailVerified chưa?
   - Nếu hợp lệ → tạo accessToken + refreshToken
   - Gọi tokenRepository.save(refreshToken)
   - Trả về { user, accessToken, refreshToken }

⑤ Repository thực thi:
   - userRepository.findByEmail():
       return User.findOne({ email }).select('+passwordHash')
   - tokenRepository.save():
       return RefreshToken.create({ userId, tokenHash, ... })

⑥ Trả về client:
   Controller nhận kết quả từ Service
   → Gọi sendSuccess(res, data, 'Login successful')
   → Client nhận: { success: true, data: { accessToken, ... } }
```

### 2.3 Luồng dữ liệu cho endpoint có bảo mật — Ví dụ: Check-in QR (UC21)

```
① Client gửi:
   POST /api/v1/checkin
   Header: Authorization: Bearer <accessToken>
   Body: { "qrCode": "tkt_abc123...", "eventId": "6627..." }

② Router:
   checkinRouter.post('/', authMiddleware, roleMiddleware('staff'), checkinController.confirm)
   → Gắn 2 middleware trước khi vào controller

③ authMiddleware chạy:
   - Đọc Header: Authorization: Bearer <token>
   - Gọi jwt.verify(token, secret)
   - Nếu token hết hạn / sai → trả lỗi 401, dừng lại
   - Nếu hợp lệ → gắn req.user = { _id, role, email }
   - Gọi next() để đi tiếp

④ roleMiddleware('staff') chạy:
   - Kiểm tra req.user.role === 'staff' hoặc 'admin'
   - Nếu không đúng role → trả lỗi 403, dừng lại
   - Nếu đúng → gọi next()

⑤ Controller → Service → Repository (như luồng trên)

⑥ Sau khi check-in thành công:
   Service gọi: io.to(eventId).emit('checkin_update', { ... })
   → Organizer đang mở dashboard nhận được update realtime qua Socket.io
```

---

## 3. Cấu trúc thư mục thực tế

```
D:\EVENTSPHERE\SRC
│
├── app.ts                          # Cấu hình Express: gắn middleware, nạp routes
├── server.ts                       # Điểm khởi động: mở cổng PORT, kết nối MongoDB
│
├── config/
│   └── app.config.ts               # Đọc process.env, export config object tập trung
│
├── shared/                         # Code dùng chung cho toàn bộ features
│   ├── errors/
│   │   ├── AppError.ts             # Class lỗi tùy chỉnh có statusCode
│   │   └── errorHandler.ts         # Middleware bắt mọi lỗi toàn app (4 tham số)
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # Verify JWT, gắn req.user vào request
│   │   └── role.middleware.ts      # Kiểm tra role: roleMiddleware('organizer')
│   ├── services/
│   │   └── .gitkeep                # Sẽ chứa: email.service.ts, cloudinary.service.ts
│   ├── types/
│   │   └── express.d.ts            # Mở rộng kiểu Express: thêm req.user vào Request
│   └── utils/
│       └── response.util.ts        # sendSuccess(), sendPaginated() — chuẩn hóa response
│
└── features/                       # Mỗi thư mục = một nhóm chức năng độc lập
    │
    ├── auth/                       # UC05, UC06 — Hào
    │   ├── auth.router.ts          # Khai báo route: POST /login, POST /register, ...
    │   ├── auth.controller.ts      # Nhận request, validate DTO, gọi service
    │   ├── auth.service.ts         # Logic: hash password, tạo JWT, refresh token
    │   ├── dto/
    │   │   └── auth.dto.ts         # Joi Schema kiểm tra dữ liệu đầu vào
    │   ├── models/
    │   │   ├── user.model.ts       # Mongoose Schema + Model cho collection "users"
    │   │   └── refreshToken.model.ts
    │   ├── repositories/
    │   │   ├── user.repository.ts  # Các hàm query: findByEmail, create, updateById
    │   │   └── token.repository.ts
    │   └── types/
    │       └── auth.types.ts       # Interface: JwtPayload, AuthResponse, LoginDto
    │
    ├── events/                     # UC01–04, UC13–15, UC17–18 — Hào · Lượng · Trọng
    │   ├── events.router.ts
    │   ├── events.controller.ts
    │   ├── events.service.ts
    │   ├── dto/
    │   │   └── .gitkeep            # Sẽ chứa: create-event.dto.ts, update-event.dto.ts
    │   ├── models/
    │   │   ├── event.model.ts      # Schema cho collection "events"
    │   │   ├── eventStaff.model.ts # Schema cho collection "event_staff"
    │   │   └── ticketType.model.ts # Schema cho collection "ticket_types"
    │   └── repositories/
    │       └── .gitkeep            # Sẽ chứa: event.repository.ts, ticketType.repository.ts
    │
    ├── tickets/                    # UC07–09, UC11–12 — Kha
    │   ├── tickets.router.ts
    │   ├── tickets.controller.ts
    │   ├── tickets.service.ts
    │   ├── dto/
    │   │   └── .gitkeep
    │   ├── models/
    │   │   ├── registration.model.ts  # Schema cho collection "registrations"
    │   │   └── ticket.model.ts        # Schema cho collection "tickets"
    │   └── repositories/
    │       └── .gitkeep
    │
    ├── checkin/                    # UC21–22 — Trọng
    │   ├── checkin.router.ts
    │   ├── checkin.controller.ts
    │   ├── checkin.service.ts
    │   ├── dto/
    │   │   └── .gitkeep
    │   ├── models/
    │   │   └── checkinLog.model.ts # Schema cho collection "checkin_logs"
    │   └── repositories/
    │       └── .gitkeep
    │
    ├── reviews/                    # UC11 — Core team
    │   ├── reviews.router.ts
    │   ├── reviews.controller.ts
    │   ├── reviews.service.ts
    │   ├── dto/
    │   │   └── .gitkeep
    │   ├── models/
    │   │   └── review.model.ts     # Schema cho collection "reviews"
    │   └── repositories/
    │       └── .gitkeep
    │
    ├── notifications/              # UC16 — Danh
    │   └── notification.worker.ts  # Bull queue worker: xử lý job gửi email/FCM
    │
    └── admin/                      # UC23–26 — Hào · Danh · Trọng
        ├── admin.router.ts
        ├── admin.controller.ts
        ├── admin.service.ts
        └── repositories/
            └── .gitkeep
```

> **`.gitkeep` là gì?** Đây là file rỗng dùng để Git theo dõi thư mục trống. Git không commit thư mục rỗng, nên ta tạo file này như một placeholder. Khi bạn bắt đầu viết code cho tính năng đó, xóa `.gitkeep` và tạo file thật vào.

---

## 4. Ý nghĩa từng tầng & từng file

### 4.1 `server.ts` — Điểm khởi động hệ thống

File đầu tiên chạy khi bạn gõ `npm run dev`. Nó làm 3 việc: kết nối MongoDB, gắn Socket.io vào HTTP server, và mở cổng PORT lắng nghe.

```ts
// server.ts
import app from './app';
import { connectDB } from './config/db.config';

const PORT = process.env.PORT ?? 3000;

async function bootstrap() {
  await connectDB();                        // Kết nối MongoDB trước
  app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
  });
}

bootstrap();
```

### 4.2 `app.ts` — Cấu hình Express

File này không khởi động server mà chỉ **cấu hình** ứng dụng Express: gắn các middleware toàn app, nạp tất cả routes của các features, đăng ký global error handler.

```ts
// app.ts
import express from 'express';
import cors from 'cors';
import { errorHandler } from './shared/errors/errorHandler';
import authRouter from './features/auth/auth.router';
import eventsRouter from './features/events/events.router';

const app = express();

// Middleware toàn app
app.use(cors());
app.use(express.json());

// Nạp routes của từng feature
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/events', eventsRouter);
// ... các features khác

// PHẢI đặt cuối cùng — bắt mọi lỗi throw từ các tầng bên trên
app.use(errorHandler);

export default app;
```

### 4.3 `config/app.config.ts` — Quản lý cấu hình tập trung

**Quy tắc bắt buộc:** Toàn dự án chỉ được đọc `process.env` tại file này. Các file khác import từ đây, không tự đọc `process.env`.

```ts
// config/app.config.ts
export const config = {
  port:     process.env.PORT ?? '3000',
  nodeEnv:  process.env.NODE_ENV ?? 'development',
  mongoUri: process.env.MONGO_URI!,          // ! = bắt buộc phải có, nếu thiếu sẽ crash
  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET!,
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
};

// ✅ Đúng — import từ config
import { config } from '../config/app.config';
jwt.sign(payload, config.jwt.accessSecret);

// ❌ Sai — đọc process.env trực tiếp trong feature file
jwt.sign(payload, process.env.JWT_ACCESS_SECRET);
```

### 4.4 `[feature].router.ts` — Cửa ngõ của feature

Router khai báo URL endpoint và gắn middleware phù hợp trước khi request đến controller. Nó **không chứa logic xử lý**, chỉ định tuyến.

```ts
// features/auth/auth.router.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();

// Endpoint công khai — không cần middleware
router.post('/register', controller.register);
router.post('/login',    controller.login);
router.post('/refresh',  controller.refresh);

// Endpoint yêu cầu đăng nhập — gắn authMiddleware
router.post('/logout',          authMiddleware, controller.logout);
router.get('/me',               authMiddleware, controller.getMe);
router.patch('/me',             authMiddleware, controller.updateMe);
router.patch('/change-password', authMiddleware, controller.changePassword);

export default router;
```

### 4.5 `[feature].controller.ts` — Tầng HTTP

Controller chỉ làm **3 việc**: nhận request, validate dữ liệu đầu vào (qua DTO), gọi service, trả response. **Tuyệt đối không viết logic nghiệp vụ ở đây.**

```ts
// features/auth/auth.controller.ts
export class AuthController {

  // ✅ Đúng — controller mỏng, không có logic
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = await validateDto(LoginSchema, req.body); // Validate trước
      const result = await authService.login(dto);          // Gọi service
      sendSuccess(res, result, 'Đăng nhập thành công');     // Trả response
    } catch (err) {
      next(err); // Chuyển lỗi cho global errorHandler
    }
  }

  // ❌ Sai — logic nghiệp vụ trong controller
  async login(req: Request, res: Response) {
    const user = await User.findOne({ email: req.body.email }); // Không được!
    if (!user) return res.status(401).json({ message: 'Sai tài khoản' });
    // ... tiếp tục vi phạm
  }
}
```

### 4.6 `[feature].service.ts` — Trái tim của logic

Service là nơi **ra quyết định**. Nó biết quy trình nghiệp vụ: nên làm gì, theo thứ tự nào, khi nào throw lỗi. Service **không được** gọi Mongoose trực tiếp — phải đi qua Repository.

```ts
// features/auth/auth.service.ts
export class AuthService {

  // ✅ Đúng — service gọi repository, không gọi Mongoose
  async login(dto: LoginDto) {
    // Bước 1: Tìm user qua repository
    const user = await userRepository.findByEmail(dto.email);
    if (!user) throw new AppError('Email hoặc mật khẩu không đúng', 401);

    // Bước 2: So sánh mật khẩu
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new AppError('Email hoặc mật khẩu không đúng', 401);

    // Bước 3: Kiểm tra trạng thái tài khoản
    if (!user.isActive) throw new AppError('Tài khoản đã bị khóa', 403);
    if (!user.emailVerified) throw new AppError('Email chưa được xác minh', 400);

    // Bước 4: Tạo tokens
    const accessToken  = jwt.sign({ _id: user._id, role: user.role }, config.jwt.accessSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ _id: user._id }, config.jwt.refreshSecret, { expiresIn: '7d' });

    // Bước 5: Lưu refresh token qua repository
    await tokenRepository.save({ userId: user._id, tokenHash: hashToken(refreshToken) });

    return { user: sanitizeUser(user), accessToken, refreshToken };
  }

  // ❌ Sai — gọi Mongoose trực tiếp trong service
  async login(dto: LoginDto) {
    const user = await User.findOne({ email: dto.email }); // Phải qua repository!
  }
}
```

### 4.7 `repositories/[name].repository.ts` — Tầng dữ liệu

Repository chứa **tất cả câu lệnh Mongoose**. Nó không có logic, chỉ thực thi query và trả kết quả. Nếu sau này đổi từ MongoDB sang PostgreSQL, bạn chỉ cần viết lại file này, không đụng đến Service.

```ts
// features/auth/repositories/user.repository.ts
export class UserRepository {

  // Tìm user theo email — dùng .select('+passwordHash') vì field này bị ẩn mặc định
  async findByEmail(email: string) {
    return User.findOne({ email }).select('+passwordHash').lean();
  }

  // Tạo user mới
  async create(data: CreateUserData) {
    return User.create(data);
  }

  // Cập nhật thông tin user
  async updateById(id: string, data: Partial<IUser>) {
    return User.findByIdAndUpdate(id, data, { new: true });
    //                                        ↑ new: true = trả về document sau khi update
  }

  // ❌ Sai — business logic trong repository
  async createIfNotExists(email: string, data: any) {
    const existing = await User.findOne({ email }); // Việc kiểm tra này thuộc về Service!
    if (existing) throw new Error('Email đã tồn tại');
    return User.create(data);
  }
}
```

### 4.8 `shared/errors/AppError.ts` — Class lỗi tùy chỉnh

```ts
// shared/errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,    // HTTP status: 400, 401, 403, 404, 409...
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Dùng trong service — throw lỗi rõ ràng với status code phù hợp
if (!event) throw new AppError('Sự kiện không tồn tại', 404);
if (ticket.status === 'CHECKED_IN') throw new AppError('Vé đã được check-in trước đó', 409);
```

### 4.9 `shared/errors/errorHandler.ts` — Bắt mọi lỗi toàn app

Express nhận biết đây là **error handler** vì có đúng 4 tham số `(err, req, res, next)`. Mọi lỗi `throw` ở bất kỳ tầng nào đều được bắt tại đây — **phải đăng ký cuối cùng** trong `app.ts`.

```ts
// shared/errors/errorHandler.ts
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,   // Express yêu cầu đủ 4 tham số, dù next không dùng
) => {
  // Lỗi do chính mình throw (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message },
    });
  }

  // Lỗi không mong đợi (bug, crash) — log ra console để debug
  console.error('Unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: { message: 'Lỗi hệ thống, vui lòng thử lại sau' },
  });
};
```

### 4.10 `shared/utils/response.util.ts` — Chuẩn hóa response

Tất cả endpoint đều phải dùng 2 hàm này để trả response — đảm bảo frontend luôn nhận được cùng một cấu trúc JSON.

```ts
// shared/utils/response.util.ts

// Dùng cho: tạo mới, cập nhật, lấy 1 item
export const sendSuccess = (
  res: Response,
  data: unknown,
  message = 'Thành công',
  statusCode = 200,
) => res.status(statusCode).json({ success: true, data, message });

// Dùng cho: danh sách có phân trang
export const sendPaginated = (res: Response, data: unknown, meta: PaginationMeta) =>
  res.status(200).json({ success: true, data, meta });
// meta: { page: 1, limit: 10, total: 100, totalPages: 10 }
```

### 4.11 `shared/types/express.d.ts` — Mở rộng kiểu TypeScript cho Express

Mặc định Express không biết `req.user` là gì. File này "dạy" TypeScript biết rằng mọi Request đều có thể có thuộc tính `user` với kiểu `IUserPayload`.

```ts
// shared/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: IUserPayload;   // Được gắn vào bởi authMiddleware sau khi verify JWT
    }
  }
}

// Sau khi khai báo này, TypeScript không còn báo lỗi:
const userId = req.user._id;  // ✅ TypeScript hiểu req.user tồn tại
```

---

## 5. Giải thích các khái niệm cốt lõi

### 5.1 DTO vs Middleware — Dễ nhầm nhất!

Đây là 2 khái niệm hay bị nhầm lẫn nhất với người mới. Cách phân biệt nhanh:

| | **Middleware** | **DTO (Joi Schema)** |
|---|---|---|
| **Chạy ở tầng nào?** | Router (trước Controller) | Controller (đầu hàm xử lý) |
| **Kiểm tra gì?** | Ngữ cảnh & quyền hạn | Nội dung dữ liệu gửi lên |
| **Câu hỏi trả lời** | "Người này là ai? Có quyền không?" | "Dữ liệu có đúng format không?" |
| **Lỗi trả về** | 401 Unauthorized / 403 Forbidden | 400 Bad Request |

**Middleware ví dụ:**

```ts
// shared/middlewares/auth.middleware.ts
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]; // Lấy token từ "Bearer <token>"

  if (!token) throw new AppError('Bạn chưa đăng nhập', 401);

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as IUserPayload;
    req.user = payload;  // Gắn thông tin user vào request để controller dùng
    next();              // Cho đi tiếp
  } catch {
    throw new AppError('Token không hợp lệ hoặc đã hết hạn', 401);
  }
};
```

**DTO (Joi Schema) ví dụ:**

```ts
// features/auth/dto/auth.dto.ts
export const LoginSchema = Joi.object({
  email:    Joi.string().email().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu tối thiểu 6 ký tự',
  }),
});

// Dùng trong controller
const dto = await validateDto(LoginSchema, req.body);
// Nếu req.body = { email: "không-phải-email", password: "123" }
// → Joi throw lỗi ngay, service không bao giờ được gọi
```

**Tóm tắt bằng câu chuyện:**

> Hãy hình dung hệ thống là một tòa nhà văn phòng.  
> **Middleware** = Bảo vệ ở cổng — kiểm tra thẻ nhân viên, chỉ cho người có thẻ hợp lệ vào.  
> **DTO** = Lễ tân ở quầy — kiểm tra form điền có đầy đủ thông tin không trước khi xử lý.  
> Bảo vệ không quan tâm form điền đúng không. Lễ tân không quan tâm người đó có thẻ nhân viên không.

---

### 5.2 Schema của DTO vs Schema của Model — Cùng tên nhưng khác hoàn toàn

Bạn sẽ thấy từ "Schema" xuất hiện ở 2 nơi: trong `dto/` (Joi Schema) và trong `models/` (Mongoose Schema). Đây là 2 thứ **hoàn toàn khác nhau**.

| | **Joi Schema (trong `dto/`)** | **Mongoose Schema (trong `models/`)** |
|---|---|---|
| **Thư viện** | `joi` | `mongoose` |
| **Mục đích** | Kiểm tra dữ liệu **đầu vào** từ client | Định nghĩa cấu trúc **lưu trữ** trong DB |
| **Chạy khi nào?** | Khi request đến (trước khi xử lý) | Khi save/query MongoDB |
| **Phạm vi** | Chỉ các field client được phép gửi | Toàn bộ document trong collection |
| **Ví dụ field** | `email`, `password` | `email`, `passwordHash`, `role`, `isActive`, `createdAt` |

**Ví dụ so sánh — Đăng ký tài khoản:**

```ts
// dto/auth.dto.ts — Joi Schema: Chỉ kiểm tra những gì CLIENT gửi lên
export const RegisterSchema = Joi.object({
  name:     Joi.string().min(2).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(), // Client gửi plain text password
  phone:    Joi.string().optional(),
  // Không có: role, isActive, passwordHash, createdAt
  // (Client không được tự set mấy field này)
});

// models/user.model.ts — Mongoose Schema: Định nghĩa TOÀN BỘ document trong DB
const userSchema = new Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  passwordHash:  { type: String, required: true, select: false }, // Ẩn mặc định khi query
  role:          { type: String, enum: ['attendee', 'organizer', 'staff', 'admin'], default: 'attendee' },
  phone:         { type: String },
  avatar:        { type: String },
  isActive:      { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
}, { timestamps: true }); // Tự động thêm createdAt, updatedAt
```

**Luồng xử lý khi đăng ký:**

```
Client gửi: { name, email, password, phone }
     ↓
Joi Schema kiểm tra: Đủ 3 field bắt buộc? Email đúng format? Password >= 6 ký tự?
     ↓ (hợp lệ)
Service: hash password → passwordHash = bcrypt.hash(password, 10)
     ↓
Repository gọi: User.create({ name, email, passwordHash, phone })
     ↓
Mongoose Schema kiểm tra lần nữa trước khi lưu: email có unique không? role có hợp lệ không?
     ↓
MongoDB lưu document đầy đủ: { name, email, passwordHash, role: 'attendee', isActive: true, ... }
```

---

### 5.3 Repository vs Model — Vai trò khác nhau

```ts
// models/user.model.ts — Model chỉ là bản thiết kế (Blueprint)
const userSchema = new Schema({ ... });
export const User = mongoose.model('User', userSchema);
// User ở đây chỉ là một đại diện của collection "users" trong DB
// Nó cung cấp các method như User.find(), User.create(), User.findById()...

// repositories/user.repository.ts — Repository đóng gói các câu query có ý nghĩa nghiệp vụ
export class UserRepository {
  // Đặt tên hàm theo nghiệp vụ, không theo câu lệnh DB
  findByEmail(email: string) {
    return User.findOne({ email }).select('+passwordHash').lean();
    // .lean() = trả về plain JS object thay vì Mongoose Document (nhanh hơn, nhẹ hơn)
  }

  findActiveOrganizers() {
    return User.find({ role: 'organizer', isActive: true }).select('name email').lean();
  }

  updateAvatar(userId: string, avatarUrl: string) {
    return User.findByIdAndUpdate(userId, { avatar: avatarUrl }, { new: true });
  }
}
```

**Tại sao không để Service gọi thẳng Model?**

```ts
// ❌ Nếu Service gọi thẳng Model:
class AuthService {
  async findUser(email: string) {
    return User.findOne({ email }).select('+passwordHash'); // Rải rác khắp nơi
  }
}
class TicketService {
  async findUser(userId: string) {
    return User.findById(userId); // Lặp lại, không nhất quán
  }
}

// ✅ Dùng Repository — tập trung một chỗ, dễ bảo trì:
// Nếu cần đổi thêm điều kiện query (ví dụ: chỉ lấy user isActive),
// chỉ sửa 1 chỗ trong repository, tất cả service đều được hưởng lợi
class UserRepository {
  findById(id: string) {
    return User.findOne({ _id: id, isActive: true }); // Sửa 1 lần, apply everywhere
  }
}
```

---

### 5.4 Tại sao có `.gitkeep` trong các thư mục?

Git không track thư mục rỗng. Khi bạn tạo cấu trúc thư mục ban đầu cho một feature nhưng chưa viết code, cần có file này để Git commit thư mục đó lên repository.

```
repositories/
└── .gitkeep    ← Xóa file này khi bạn tạo file .ts đầu tiên trong thư mục
```

---

## 6. Danh sách Use Cases & phân công

Hệ thống được phân rã thành **26 Use Cases (UC)** chia cho 5 thành viên:

| Mã UC | Tên chức năng | Actor | Thư mục | Người phụ trách | Trạng thái |
|---|---|---|---|---|---|
| **UC01** | Xem danh sách sự kiện | Guest | `features/events/` | Hào | ✅ Done |
| **UC02** | Xem chi tiết sự kiện | Guest | `features/events/` | Hào | ✅ Done |
| **UC03** | Tìm kiếm sự kiện (full-text) | Guest | `features/events/` | Hào | ✅ Done |
| **UC04** | Lọc sự kiện (category, date) | Guest | `features/events/` | Lượng | ✅ Done |
| **UC05** | Đăng ký tài khoản | Guest | `features/auth/` | **Hào** | ✅ Done |
| **UC06** | Đăng nhập | Registered User | `features/auth/` | **Hào** | ✅ Done |
| **UC07** | Đăng ký tham dự sự kiện | Attendee | `features/tickets/` | **Kha** | 🔄 In Progress |
| **UC08** | Thanh toán vé (VNPay/Stripe) | Attendee | `features/tickets/` | **Kha** | ⏳ Pending |
| **UC09** | Xem chi tiết vé + QR Code | Attendee | `features/tickets/` | **Kha** | ⏳ Pending |
| **UC10** | Thêm sự kiện vào Google Calendar | Attendee | `features/tickets/` | **Kha** | ⏳ Pending |
| **UC11** | Đánh giá & chấm điểm sự kiện | Attendee | `features/reviews/` | Core team | ⏳ Pending |
| **UC12** | Xem lịch sử tham dự | Attendee | `features/tickets/` | **Kha** | ⏳ Pending |
| **UC13** | Quản lý sự kiện (CRUD + Banner) | Organizer | `features/events/` | **Hào** | 🔄 In Progress |
| **UC14** | Quản lý loại vé | Organizer | `features/events/` | **Lượng** | ⏳ Pending |
| **UC15** | Xem danh sách đăng ký | Organizer | `features/events/` | **Lượng** | ⏳ Pending |
| **UC16** | Gửi thông báo hàng loạt | Organizer | `features/notifications/` | **Danh** | ⏳ Pending |
| **UC17** | Phân công nhân viên check-in | Organizer | `features/events/` | **Trọng** | ⏳ Pending |
| **UC18** | Xuất danh sách attendee (CSV) | Organizer | `features/events/` | **Lượng** | ⏳ Pending |
| **UC19** | Báo cáo tổng kết sự kiện | Organizer | `features/events/` | **Danh** | ⏳ Pending |
| **UC20** | Dashboard realtime check-in | Organizer | `features/events/` | **Danh · Trọng** | ⏳ Pending |
| **UC21** | Quét QR check-in | Staff | `features/checkin/` | **Trọng** | ⏳ Pending |
| **UC22** | Check-in thủ công (tên/email) | Staff | `features/checkin/` | **Trọng** | ⏳ Pending |
| **UC23** | Phê duyệt / Từ chối sự kiện | Admin | `features/admin/` | **Hào** | 🔄 In Progress |
| **UC24** | Quản lý tài khoản (khóa/mở) | Admin | `features/admin/` | Core team | ⏳ Pending |
| **UC25** | Dashboard tổng quan hệ thống | Admin | `features/admin/` | **Danh · Trọng** | ⏳ Pending |
| **UC26** | Báo cáo doanh thu toàn nền tảng | Admin | `features/admin/` | **Danh · Trọng** | ⏳ Pending |

---

## 7. Quản lý thư viện

Chiến lược: **cài đến đâu dùng đến đó** — tránh cài thư viện chưa cần, giữ dự án gọn nhẹ.

### Thư viện hiện có (Core Stack)

| Thư viện | Vai trò | Dùng ở đâu |
|---|---|---|
| `express` | HTTP framework, định tuyến API | `app.ts`, tất cả router |
| `mongoose` | ODM kết nối MongoDB, định nghĩa Schema | Tất cả `models/`, `repositories/` |
| `dotenv` | Đọc file `.env` vào `process.env` | `server.ts` (import đầu tiên) |
| `cors` | Cho phép frontend khác domain gọi API | `app.ts` |
| `joi` | Validate dữ liệu đầu vào (DTO Layer) | Tất cả `dto/` |
| `bcrypt` | Hash + verify mật khẩu một chiều | `features/auth/auth.service.ts` |
| `jsonwebtoken` | Tạo và verify JWT access/refresh token | `shared/utils/jwt.util.ts` |
| `typescript` | Ngôn ngữ chính, type safety | Toàn dự án |
| `nodemon` *(dev)* | Tự restart server khi file thay đổi | `npm run dev` |
| `ts-node` *(dev)* | Chạy TypeScript trực tiếp (không build) | `npm run dev` |

### Thư viện sẽ cài khi phát triển tính năng tiếp theo

| Thư viện | Cài khi nào | Phục vụ UC nào |
|---|---|---|
| `socket.io` | Bắt đầu làm UC20 (Dashboard) | UC20, UC21 — Realtime |
| `bull` + `ioredis` | Bắt đầu làm UC16 (Notifications) | UC16 — Async job queue |
| `nodemailer` | Bắt đầu làm UC09 (Gửi vé) | UC05, UC09 — Email |
| `cloudinary` | Bắt đầu làm UC13 (Upload ảnh) | UC13 — File upload |
| `firebase-admin` | Bắt đầu làm UC16 (Push notification) | UC16 — FCM |
| `multer` | Cùng lúc với cloudinary | UC13 — Xử lý multipart |
| `axios` *(nếu cần)* | Khi gọi API bên ngoài (VNPay) | UC08 — Payment |

---

## 8. Hướng dẫn khởi động dự án

### Yêu cầu môi trường

| Phần mềm | Phiên bản | Kiểm tra |
|---|---|---|
| Node.js | 22 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| MongoDB | 6.0+ (local hoặc Atlas) | `mongod --version` |

### Các bước cài đặt

**Bước 1 — Cài thư viện:**

```bash
npm install
```

**Bước 2 — Tạo file cấu hình môi trường:**

Tạo file `.env` tại thư mục gốc (cùng cấp với `package.json`):

```bash
# .env
PORT=3000
NODE_ENV=development

# Kết nối MongoDB local
MONGO_URI=mongodb://localhost:27017/eventsphere

# Hoặc dùng MongoDB Atlas (cloud) — thay bằng connection string của bạn
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/eventsphere

# JWT — điền bất kỳ chuỗi bí mật nào (môi trường dev)
JWT_ACCESS_SECRET=dev_access_secret_change_in_production
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production
JWT_REFRESH_EXPIRES=7d
```

**Bước 3 — Khởi động MongoDB** (nếu dùng local):

```bash
# macOS / Linux
mongod

# Windows — chạy MongoDB Compass hoặc dịch vụ MongoDB
# Hoặc dùng MongoDB Atlas thì bỏ qua bước này
```

**Bước 4 — Chạy server:**

```bash
npm run dev
```

**Kết quả mong đợi:**

```
🍃 MongoDB đã kết nối thành công
🚀 EventSphere Backend Server đang chạy tại cổng 3000
```

### Kiểm tra server hoạt động

```bash
# Gửi request test bằng curl
curl http://localhost:3000/api/v1/events

# Hoặc mở trình duyệt / Postman
GET http://localhost:3000/api/v1/events
```

### Scripts có sẵn

| Script | Lệnh | Dùng khi nào |
|---|---|---|
| Chạy dev (auto-reload) | `npm run dev` | Lập trình hàng ngày |
| Build TypeScript | `npm run build` | Chuẩn bị deploy |
| Chạy production | `npm start` | Sau khi build |
| Chạy tests | `npm test` | Trước khi tạo PR |
| Kiểm tra TypeScript | `npx tsc --noEmit` | Trước khi commit |

---

## 9. Hướng dẫn sử dụng Middleware phân quyền

Dự án có 2 middleware dùng chung tại `src/shared/middlewares/`:

### 9.1 `authMiddleware` — Xác thực JWT

Kiểm tra `Authorization: Bearer <token>` trong header. Nếu hợp lệ, gắn `req.user = { id, role }` vào request và gọi `next()`. Nếu không có token hoặc token sai/hết hạn → trả `401`.

```ts
import { authMiddleware } from '../../shared/middlewares/auth.middleware';

// Áp dụng cho 1 route
router.get('/profile', authMiddleware, controller.getProfile);
```

### 9.2 `roleMiddleware` — Phân quyền theo Role

Phải dùng **sau** `authMiddleware`. Nhận danh sách role được phép, nếu `req.user.role` không nằm trong danh sách → trả `403`.

```ts
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleMiddleware } from '../../shared/middlewares/role.middleware';

// Chỉ organizer và admin được tạo event
router.post('/', authMiddleware, roleMiddleware('organizer', 'admin'), controller.create);

// Chỉ admin được duyệt event
router.patch('/:id/approve', authMiddleware, roleMiddleware('admin'), controller.approve);

// Chỉ staff và admin được check-in
router.post('/checkin', authMiddleware, roleMiddleware('staff', 'admin'), controller.checkin);
```

### 9.3 Bảng phân quyền chi tiết theo từng Role

#### 🔓 Guest — Không cần token

| Method | Endpoint | Chức năng | UC |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản | UC05 |
| `POST` | `/api/v1/auth/login` | Đăng nhập | UC06 |
| `GET` | `/api/v1/events` | Xem danh sách / lọc event | UC01, UC04 |
| `GET` | `/api/v1/events/search` | Tìm kiếm event | UC03 |
| `GET` | `/api/v1/events/:id` | Xem chi tiết event | UC02 |

#### 🎫 Attendee — `authMiddleware`

| Method | Endpoint | Chức năng | UC |
|---|---|---|---|
| `POST` | `/api/v1/auth/logout` | Đăng xuất ✅ | UC06 |
| `POST` | `/api/v1/tickets` | Đăng ký tham dự event | UC07 |
| `GET` | `/api/v1/tickets/:id` | Xem chi tiết vé + QR | UC09 |
| `GET` | `/api/v1/tickets/history` | Lịch sử tham dự | UC12 |
| `POST` | `/api/v1/reviews` | Đánh giá sự kiện | UC11 |

```ts
// Cách dùng trong router
router.post('/logout', authMiddleware, controller.logout);
router.get('/history', authMiddleware, controller.getHistory);
```

#### 🏢 Organizer — `authMiddleware` + `roleMiddleware('organizer', 'admin')`

| Method | Endpoint | Chức năng | UC |
|---|---|---|---|
| `POST` | `/api/v1/events` | Tạo event mới | UC13 |
| `PUT` | `/api/v1/events/:id` | Cập nhật event | UC13 |
| `DELETE` | `/api/v1/events/:id` | Xóa event | UC13 |
| `GET` | `/api/v1/events/:id/registrations` | Xem danh sách đăng ký | UC15 |
| `GET` | `/api/v1/events/:id/export` | Xuất CSV attendee | UC18 |
| `POST` | `/api/v1/notifications` | Gửi thông báo hàng loạt | UC16 |

```ts
// Cách dùng trong router
router.post('/', authMiddleware, roleMiddleware('organizer', 'admin'), controller.create);
router.put('/:id', authMiddleware, roleMiddleware('organizer', 'admin'), controller.update);
```

#### 👷 Staff — `authMiddleware` + `roleMiddleware('staff', 'admin')`

| Method | Endpoint | Chức năng | UC |
|---|---|---|---|
| `POST` | `/api/v1/checkin/qr` | Quét QR check-in | UC21 |
| `POST` | `/api/v1/checkin/manual` | Check-in thủ công | UC22 |

```ts
// Cách dùng trong router
router.post('/qr', authMiddleware, roleMiddleware('staff', 'admin'), controller.checkinQR);
router.post('/manual', authMiddleware, roleMiddleware('staff', 'admin'), controller.checkinManual);
```

#### 👑 Admin — `authMiddleware` + `roleMiddleware('admin')`

| Method | Endpoint | Chức năng | UC |
|---|---|---|---|
| `PATCH` | `/api/v1/admin/events/:id/approve` | Duyệt sự kiện | UC23 |
| `PATCH` | `/api/v1/admin/events/:id/reject` | Từ chối sự kiện | UC23 |
| `GET` | `/api/v1/admin/users` | Quản lý tài khoản | UC24 |
| `PATCH` | `/api/v1/admin/users/:id/status` | Khóa / mở tài khoản | UC24 |
| `GET` | `/api/v1/admin/dashboard` | Dashboard hệ thống | UC25 |
| `GET` | `/api/v1/admin/revenue` | Báo cáo doanh thu | UC26 |

```ts
// Cách dùng trong router
router.patch('/:id/approve', authMiddleware, roleMiddleware('admin'), controller.approve);
router.patch('/:id/reject', authMiddleware, roleMiddleware('admin'), controller.reject);
```

### 9.4 Import chuẩn cho mọi router file

```ts
import { authMiddleware } from '../../shared/middlewares/auth.middleware';
import { roleMiddleware } from '../../shared/middlewares/role.middleware';
```

> **Lưu ý đường dẫn:** Điều chỉnh `../../` tùy theo vị trí file router của bạn so với thư mục `shared/`.

### 9.5 Luồng xử lý khi có lỗi

```
Không có token        → authMiddleware          → 401 "Bạn chưa đăng nhập"
Token sai/hết hạn     → authMiddleware          → 401 "Token không hợp lệ hoặc đã hết hạn"
Sai role              → roleMiddleware          → 403 "Bạn không có quyền thực hiện hành động này"
refreshToken không hợp lệ → AuthService.logout → 401 "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"
```

---

## 10. Tiến độ phát triển

> Cập nhật lần cuối: 2025 — Hào

### ✅ Đã hoàn thành

| Tính năng | Mô tả | Nhánh |
|---|---|---|
| UC01-04 — Event Browsing | Xem danh sách, chi tiết, tìm kiếm, lọc event | `feat/uc01-04-events-browse` |
| UC05 — Register | Đăng ký tài khoản với bcrypt + JWT | `feat/uc05-06-auth-core` |
| UC06 — Login | Đăng nhập, cấp access token + refresh token | `feat/uc05-06-auth-core` |
| UC06 — Logout | Đăng xuất, xóa refresh token khỏi DB | `feat/uc05-06-auth-core` |
| Auth Middleware | `authMiddleware` + `roleMiddleware` dùng chung toàn app | `feat/uc05-06-auth-core` |

### 🔄 Đang thực hiện

| Tính năng | Người phụ trách | Nhánh |
|---|---|---|
| UC13 — Event Management | Hào | `feat/uc13-events-manage` |
| UC07 — Ticket Registration | Kha | `feat/uc07-tickets-register` |

### ⏳ Chưa bắt đầu

UC08–UC12, UC14–UC26

---

*EventSphere Backend Team · 2025*
