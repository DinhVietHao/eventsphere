import swaggerJSDoc = require("swagger-jsdoc");

const objectIdPattern = "^[a-fA-F0-9]{24}$";
const bearerSecurity = [{ bearerAuth: [] }];

type SchemaObject = swaggerJSDoc.Schema;
type ParameterObject = swaggerJSDoc.Parameter;
type ReferenceObject = swaggerJSDoc.Reference;
type OperationObject = swaggerJSDoc.Operation;
type ResponsesObject = swaggerJSDoc.Responses;

const ref = (name: string): ReferenceObject => ({
  $ref: `#/components/schemas/${name}`,
});

const schema = (
  name: string,
  description: string,
  dataSchema?: SchemaObject | ReferenceObject,
): ReferenceObject | swaggerJSDoc.Response => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          ref("SuccessResponse"),
          ...(dataSchema
            ? [
                {
                  type: "object",
                  properties: { data: dataSchema },
                },
              ]
            : []),
        ],
      },
      examples: {
        success: {
          value: {
            success: true,
            message: name,
            data: dataSchema ? {} : null,
          },
        },
      },
    },
  },
});

const ok = (
  message: string,
  dataSchema?: SchemaObject | ReferenceObject,
): swaggerJSDoc.Response => schema(message, message, dataSchema) as swaggerJSDoc.Response;

const created = (
  message: string,
  dataSchema?: SchemaObject | ReferenceObject,
): swaggerJSDoc.Response => ({
  ...ok(message, dataSchema),
  description: message,
});

const errorRef = (description: string): swaggerJSDoc.Response => ({
  description,
  content: {
    "application/json": {
      schema: ref("ErrorResponse"),
    },
  },
});

const validationErrorRef = (): swaggerJSDoc.Response => ({
  description: "Validation failed",
  content: {
    "application/json": {
      schema: ref("ValidationErrorResponse"),
      examples: {
        validation: {
          value: {
            success: false,
            data: null,
            message: "Validation failed",
            error: ["\"eventId\" must only contain hexadecimal characters"],
          },
        },
      },
    },
  },
});

const standardResponses = (
  success: swaggerJSDoc.Response,
  extras: ResponsesObject = {},
): ResponsesObject => ({
  "200": success,
  "400": validationErrorRef(),
  "401": errorRef("Unauthorized"),
  "403": errorRef("Forbidden"),
  "404": errorRef("Resource not found"),
  "409": errorRef("Conflict"),
  "500": errorRef("Internal server error"),
  ...extras,
});

const objectIdParam = (name: string, description: string): ParameterObject => ({
  in: "path",
  name,
  required: true,
  schema: {
    type: "string",
    pattern: objectIdPattern,
    example: "687cf6ca4a88c040ca920391",
  },
  description,
});

const queryParam = (
  name: string,
  schemaValue: SchemaObject,
  description: string,
): ParameterObject => ({
  in: "query",
  name,
  required: false,
  schema: schemaValue,
  description,
});

const jsonBody = (
  schemaValue: SchemaObject | ReferenceObject,
  required = true,
): swaggerJSDoc.RequestBody => ({
  required,
  content: {
    "application/json": {
      schema: schemaValue,
    },
  },
});

const multipartEventBody = (requiredFields: string[]): swaggerJSDoc.RequestBody => ({
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
        properties: {
          title: { type: "string", minLength: 3, maxLength: 100 },
          description: { type: "string", minLength: 10 },
          category: { $ref: "#/components/schemas/EventCategory" },
          location: { type: "string" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          actionType: {
            type: "string",
            enum: ["draft", "submit"],
            default: "draft",
          },
          banner: {
            type: "string",
            format: "binary",
            description:
              "Optional event banner image. Field name is banner. Allowed file extensions: jpg, jpeg, png, webp. Maximum size: 10MB.",
          },
        },
      },
      encoding: {
        banner: {
          contentType: "image/jpeg, image/png, image/webp",
        },
      },
    },
  },
});

const pageParam = queryParam(
  "page",
  { type: "integer", minimum: 1, default: 1 },
  "Page number.",
);

const limitParam = (defaultValue = 10, max = 100): ParameterObject =>
  queryParam(
    "limit",
    { type: "integer", minimum: 1, maximum: max, default: defaultValue },
    "Items per page.",
  );

const operation = (value: OperationObject): OperationObject => value;

const arrayOf = (item: SchemaObject | ReferenceObject): SchemaObject => ({
  type: "array",
  items: item,
});

const idProperty: SchemaObject = {
  type: "string",
  pattern: objectIdPattern,
  example: "687cf6ca4a88c040ca920391",
};

export const swaggerDefinition: swaggerJSDoc.OAS3Definition = {
  openapi: "3.0.3",
  info: {
    title: "EventSphere API",
    version: "1.0.0",
    description:
      "RESTful API documentation for the EventSphere event management and QR check-in system.",
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT ?? "3000"}`,
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Authentication" },
    { name: "Events" },
    { name: "Ticket Types" },
    { name: "Registrations" },
    { name: "Tickets" },
    { name: "Payments" },
    { name: "Reviews" },
    { name: "Check-in" },
    { name: "Organizer" },
    { name: "Staff" },
    { name: "Admin" },
    { name: "Notifications" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ObjectId: idProperty,
      EventCategory: {
        type: "string",
        enum: ["music", "tech", "sport", "education"],
      },
      EventStatus: {
        type: "string",
        enum: ["DRAFT", "PENDING", "APPROVED", "ONGOING", "ENDED", "CANCELLED"],
      },
      UserRole: {
        type: "string",
        enum: ["attendee", "organizer", "staff", "admin"],
      },
      TicketStatus: {
        type: "string",
        enum: ["ISSUED", "CHECKED_IN", "EXPIRED", "CANCELLED"],
      },
      RegistrationStatus: {
        type: "string",
        enum: ["pending_payment", "confirmed", "payment_failed", "cancelled"],
      },
      PaymentStatus: {
        type: "string",
        enum: ["unpaid", "paid", "free", "pending"],
      },
      PaymentRecordStatus: {
        type: "string",
        enum: ["pending", "paid", "failed"],
      },
      CheckinMethod: {
        type: "string",
        enum: ["qr_scan", "manual"],
      },
      SuccessResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "OK" },
          data: { nullable: true },
        },
      },
      ErrorResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", example: false },
          data: { nullable: true, example: null },
          message: { type: "string", example: "Token khong hop le hoac da het han" },
          error: { nullable: true, example: "Token khong hop le hoac da het han" },
          stack: {
            type: "string",
            description: "Only returned when NODE_ENV is development.",
          },
        },
      },
      ValidationErrorResponse: {
        type: "object",
        required: ["success", "message"],
        properties: {
          success: { type: "boolean", example: false },
          data: { nullable: true, example: null },
          message: { type: "string", example: "Validation failed" },
          error: {
            oneOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
            nullable: true,
          },
        },
      },
      PublicUser: {
        type: "object",
        properties: {
          id: idProperty,
          name: { type: "string", example: "Nguyen Van A" },
          email: { type: "string", format: "email", example: "attendee@example.com" },
          role: { $ref: "#/components/schemas/UserRole" },
          phone: { type: "string", nullable: true, example: "0901234567" },
          avatar: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
          emailVerified: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      AuthTokens: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/PublicUser" },
          accessToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example.signature",
          },
          refreshToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.signature",
          },
        },
      },
      Event: {
        type: "object",
        properties: {
          _id: idProperty,
          title: { type: "string", example: "EventSphere Tech Day" },
          description: { type: "string" },
          category: { $ref: "#/components/schemas/EventCategory" },
          location: { type: "string", example: "Ho Chi Minh City" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          status: { $ref: "#/components/schemas/EventStatus" },
          bannerUrl: { type: "string", nullable: true },
          organizerId: {
            oneOf: [ref("ObjectId"), ref("PublicUser")],
          },
          avgRating: { type: "number", example: 4.5 },
          attendeeCount: { type: "integer", example: 120 },
          rejectionReason: { type: "string", nullable: true },
          reviewedBy: { nullable: true, oneOf: [ref("ObjectId"), ref("PublicUser")] },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          price: { type: "number", nullable: true, description: "Minimum ticket price on public list responses." },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      TicketType: {
        type: "object",
        properties: {
          _id: idProperty,
          eventId: idProperty,
          name: { type: "string", example: "Standard" },
          price: { type: "number", minimum: 0, example: 150000 },
          quota: { type: "integer", minimum: 1, example: 100 },
          sold: { type: "integer", example: 12 },
          description: { type: "string", nullable: true },
        },
      },
      Registration: {
        type: "object",
        properties: {
          _id: idProperty,
          userId: idProperty,
          eventId: idProperty,
          ticketTypeId: idProperty,
          status: { $ref: "#/components/schemas/RegistrationStatus" },
          paymentStatus: { $ref: "#/components/schemas/PaymentStatus" },
          paymentRef: { type: "string", nullable: true },
          registeredAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Ticket: {
        type: "object",
        properties: {
          _id: idProperty,
          registrationId: idProperty,
          attendeeId: idProperty,
          eventId: idProperty,
          ticketTypeId: idProperty,
          qrCode: {
            type: "string",
            description: "QR code data generated for the ticket.",
          },
          status: { $ref: "#/components/schemas/TicketStatus" },
          issuedAt: { type: "string", format: "date-time" },
          expiredAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Payment: {
        type: "object",
        properties: {
          _id: idProperty,
          registrationId: idProperty,
          attendeeId: idProperty,
          eventId: idProperty,
          ticketTypeId: idProperty,
          amount: { type: "number", example: 150000 },
          orderCode: { type: "string", example: "1784567631808" },
          status: { $ref: "#/components/schemas/PaymentRecordStatus" },
          provider: { type: "string", enum: ["vnpay"] },
          paymentUrl: { type: "string", format: "uri" },
          gatewayTransactionNo: { type: "string" },
          paidAt: { type: "string", format: "date-time" },
          failedAt: { type: "string", format: "date-time" },
        },
      },
      Review: {
        type: "object",
        properties: {
          _id: idProperty,
          userId: idProperty,
          eventId: idProperty,
          rating: { type: "integer", minimum: 1, maximum: 5 },
          comment: { type: "string", nullable: true, maxLength: 500 },
          reviewedAt: { type: "string", format: "date-time" },
          hasEdited: { type: "boolean", example: false },
        },
      },
      CheckinLog: {
        type: "object",
        properties: {
          _id: idProperty,
          ticketId: idProperty,
          eventId: idProperty,
          staffId: idProperty,
          checkedAt: { type: "string", format: "date-time" },
          method: { $ref: "#/components/schemas/CheckinMethod" },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          currentPage: { type: "integer", example: 1 },
          totalPages: { type: "integer", example: 3 },
          totalItems: { type: "integer", example: 25 },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 50 },
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 6, maxLength: 30 },
          role: { $ref: "#/components/schemas/UserRole" },
          phone: { type: "string", nullable: true },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      },
      UpdateProfileRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 50 },
          phone: { type: "string", pattern: "^0[0-9]{9}$", nullable: true },
          avatar: { type: "string", format: "uri", nullable: true },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword", "confirmPassword"],
        properties: {
          currentPassword: { type: "string", format: "password" },
          newPassword: { type: "string", format: "password", minLength: 6, maxLength: 30 },
          confirmPassword: { type: "string", format: "password" },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        properties: { email: { type: "string", format: "email" } },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "password", "confirmPassword"],
        properties: {
          token: { type: "string" },
          password: { type: "string", format: "password", minLength: 6, maxLength: 30 },
          confirmPassword: { type: "string", format: "password" },
        },
      },
      LogoutRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } },
      },
      TicketTypeRequest: {
        type: "object",
        required: ["name", "price", "quota"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 50 },
          price: { type: "number", minimum: 0 },
          quota: { type: "integer", minimum: 1 },
          description: { type: "string", nullable: true },
        },
      },
      RegisterAttendanceRequest: {
        type: "object",
        required: ["eventId", "ticketTypeId"],
        properties: {
          eventId: idProperty,
          ticketTypeId: idProperty,
        },
      },
      RegisterAttendanceResult: {
        type: "object",
        properties: {
          registration: { $ref: "#/components/schemas/Registration" },
          ticket: { nullable: true, oneOf: [ref("Ticket")] },
          payment: {
            type: "object",
            nullable: true,
            properties: {
              amount: { type: "number" },
              currency: { type: "string", enum: ["VND"] },
            },
          },
          nextStep: {
            type: "string",
            enum: ["payment_required", "ticket_issued"],
          },
        },
      },
      CreateVNPayPaymentRequest: {
        type: "object",
        required: ["registrationId"],
        properties: {
          registrationId: idProperty,
          bankCode: { type: "string", example: "NCB" },
          language: { type: "string", default: "vn", example: "vn" },
        },
      },
      VNPayPaymentUrlResult: {
        type: "object",
        properties: {
          paymentUrl: { type: "string", format: "uri" },
          orderCode: { type: "string" },
          amount: { type: "number" },
          registrationId: idProperty,
        },
      },
      VNPayIpnResponse: {
        type: "object",
        properties: {
          RspCode: { type: "string", example: "00" },
          Message: { type: "string", example: "Confirm Success" },
        },
      },
      QrCheckinRequest: {
        type: "object",
        required: ["registrationId", "eventId", "timestamp"],
        properties: {
          registrationId: idProperty,
          eventId: idProperty,
          timestamp: { type: "integer", minimum: 1, example: 1784567631808 },
        },
      },
      ManualCheckinRequest: {
        type: "object",
        required: ["registrationId", "eventId"],
        properties: {
          registrationId: idProperty,
          eventId: idProperty,
          timestamp: { type: "integer", minimum: 1, example: 1784567631808 },
        },
      },
      SendNotificationRequest: {
        type: "object",
        required: ["eventId", "subject", "message"],
        properties: {
          eventId: idProperty,
          subject: { type: "string", minLength: 1, maxLength: 200 },
          message: { type: "string", minLength: 1, maxLength: 2000 },
        },
      },
      RejectEventRequest: {
        type: "object",
        required: ["rejectionReason"],
        properties: {
          rejectionReason: { type: "string", minLength: 10, maxLength: 500 },
        },
      },
      LockAccountRequest: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string", minLength: 10, maxLength: 500 },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/register": {
      post: operation({
        tags: ["Authentication"],
        summary: "Register account",
        description: "Create a user account and send email verification.",
        operationId: "registerAccount",
        requestBody: jsonBody(ref("RegisterRequest")),
        responses: standardResponses(created("Dang ky thanh cong", ref("PublicUser")), {
          "201": created("Dang ky thanh cong", ref("PublicUser")),
        }),
      }),
    },
    "/api/v1/auth/login": {
      post: operation({
        tags: ["Authentication"],
        summary: "Login",
        description: "Authenticate verified active user and return JWT tokens.",
        operationId: "login",
        requestBody: jsonBody(ref("LoginRequest")),
        responses: standardResponses(ok("Dang nhap thanh cong", ref("AuthTokens"))),
      }),
    },
    "/api/v1/auth/logout": {
      post: operation({
        tags: ["Authentication"],
        summary: "Logout",
        description: "Revoke a refresh token.",
        operationId: "logout",
        security: bearerSecurity,
        requestBody: jsonBody(ref("LogoutRequest")),
        responses: standardResponses(ok("Dang xuat thanh cong")),
      }),
    },
    "/api/v1/auth/verify-email": {
      get: operation({
        tags: ["Authentication"],
        summary: "Verify email",
        description: "Verify account email with the token sent by email.",
        operationId: "verifyEmail",
        parameters: [
          {
            in: "query",
            name: "token",
            required: true,
            schema: { type: "string" },
            description: "Raw email verification token.",
          },
        ],
        responses: standardResponses(ok("Xac thuc email thanh cong")),
      }),
    },
    "/api/v1/auth/forgot-password": {
      post: operation({
        tags: ["Authentication"],
        summary: "Request password reset email",
        description: "Send a password reset link if the email exists.",
        operationId: "forgotPassword",
        requestBody: jsonBody(ref("ForgotPasswordRequest")),
        responses: standardResponses(ok("Password reset email accepted")),
      }),
    },
    "/api/v1/auth/reset-password": {
      post: operation({
        tags: ["Authentication"],
        summary: "Reset password",
        description: "Reset password with the token received by email.",
        operationId: "resetPassword",
        requestBody: jsonBody(ref("ResetPasswordRequest")),
        responses: standardResponses(ok("Dat lai mat khau thanh cong")),
      }),
    },
    "/api/v1/auth/me": {
      get: operation({
        tags: ["Authentication"],
        summary: "Get current profile",
        description: "Return profile for the authenticated user.",
        operationId: "getCurrentProfile",
        security: bearerSecurity,
        responses: standardResponses(ok("Lay thong tin thanh cong", ref("PublicUser"))),
      }),
      patch: operation({
        tags: ["Authentication"],
        summary: "Update current profile",
        description: "Update allowed profile fields only.",
        operationId: "updateCurrentProfile",
        security: bearerSecurity,
        requestBody: jsonBody(ref("UpdateProfileRequest")),
        responses: standardResponses(ok("Cap nhat thong tin thanh cong", ref("PublicUser"))),
      }),
    },
    "/api/v1/auth/change-password": {
      patch: operation({
        tags: ["Authentication"],
        summary: "Change password",
        description: "Change password for authenticated user.",
        operationId: "changePassword",
        security: bearerSecurity,
        requestBody: jsonBody(ref("ChangePasswordRequest")),
        responses: standardResponses(ok("Doi mat khau thanh cong")),
      }),
    },
    "/api/v1/events/search": {
      get: operation({
        tags: ["Events"],
        summary: "Search events",
        description: "Search published events by keyword query q.",
        operationId: "searchEvents",
        parameters: [
          {
            in: "query",
            name: "q",
            required: true,
            schema: { type: "string", minLength: 1 },
            description: "Search keyword.",
          },
        ],
        responses: standardResponses(ok("Search events successfully", arrayOf(ref("Event")))),
      }),
    },
    "/api/v1/events/my": {
      get: operation({
        tags: ["Organizer"],
        summary: "Get my events",
        description: "List events owned by authenticated organizer or admin.",
        operationId: "getMyEvents",
        security: bearerSecurity,
        parameters: [pageParam, limitParam(10)],
        responses: standardResponses(
          ok("Get my events successfully", {
            type: "object",
            properties: {
              events: arrayOf(ref("Event")),
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
            },
          }),
        ),
      }),
    },
    "/api/v1/events": {
      get: operation({
        tags: ["Events"],
        summary: "Get public events",
        description:
          "List published events. If category, startFrom, or startTo is present, filtered response includes events, total, page and limit.",
        operationId: "getPublishedEvents",
        parameters: [
          pageParam,
          limitParam(10),
          queryParam("category", { $ref: "#/components/schemas/EventCategory" }, "Filter by category."),
          queryParam("startFrom", { type: "string", format: "date-time" }, "Filter start date from."),
          queryParam("startTo", { type: "string", format: "date-time" }, "Filter start date to."),
        ],
        responses: standardResponses(
          ok("Get events successfully", {
            oneOf: [
              arrayOf(ref("Event")),
              {
                type: "object",
                properties: {
                  events: arrayOf(ref("Event")),
                  total: { type: "integer" },
                  page: { type: "integer" },
                  limit: { type: "integer" },
                },
              },
            ],
          }),
        ),
      }),
      post: operation({
        tags: ["Organizer"],
        summary: "Create event",
        description: "Create a draft event or submit immediately based on actionType.",
        operationId: "createEvent",
        security: bearerSecurity,
        requestBody: multipartEventBody(["title", "description", "category", "location", "startDate", "endDate"]),
        responses: standardResponses(ok("Event created successfully", ref("Event")), {
          "201": created("Event created successfully", ref("Event")),
        }),
      }),
    },
    "/api/v1/events/{id}": {
      get: operation({
        tags: ["Events"],
        summary: "Get event by id",
        description: "Get one event by MongoDB ObjectId.",
        operationId: "getEventById",
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: standardResponses(ok("Get event successfully", ref("Event"))),
      }),
      put: operation({
        tags: ["Organizer"],
        summary: "Update event",
        description: "Update owned draft event. Optional banner upload uses field name banner.",
        operationId: "updateEvent",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        requestBody: multipartEventBody([]),
        responses: standardResponses(ok("Event updated successfully", ref("Event"))),
      }),
      delete: operation({
        tags: ["Organizer"],
        summary: "Delete event",
        description: "Delete an owned event when business rules allow it.",
        operationId: "deleteEvent",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: standardResponses(ok("Event deleted successfully")),
      }),
    },
    "/api/v1/events/{id}/submit": {
      patch: operation({
        tags: ["Organizer"],
        summary: "Submit event for review",
        description: "Move owned DRAFT event to PENDING.",
        operationId: "submitEvent",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: standardResponses(ok("Event submitted successfully", ref("Event"))),
      }),
    },
    "/api/v1/events/{id}/cancel": {
      patch: operation({
        tags: ["Organizer"],
        summary: "Cancel pending event",
        description: "Current source moves owned PENDING event back to DRAFT.",
        operationId: "cancelEvent",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: standardResponses(ok("Event cancelled successfully", ref("Event"))),
      }),
    },
    "/api/v1/events/{id}/staffs": {
      post: operation({
        tags: ["Staff", "Organizer"],
        summary: "Assign staff to event",
        description: "Assign an existing staff account to an owned event.",
        operationId: "addEventStaff",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        requestBody: jsonBody({
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        }),
        responses: standardResponses(ok("Them nhan vien thanh cong"), {
          "201": created("Them nhan vien thanh cong"),
        }),
      }),
    },
    "/api/v1/events/{id}/staffs/{staffId}": {
      delete: operation({
        tags: ["Staff", "Organizer"],
        summary: "Remove staff from event",
        description: "Remove assigned staff from an owned event.",
        operationId: "removeEventStaff",
        security: bearerSecurity,
        parameters: [
          objectIdParam("id", "Event ObjectId."),
          objectIdParam("staffId", "Staff user ObjectId."),
        ],
        responses: standardResponses(ok("Xoa nhan vien khoi su kien thanh cong")),
      }),
    },
    "/api/v1/events/{id}/registrations": {
      get: operation({
        tags: ["Organizer", "Registrations"],
        summary: "Get event registrations",
        description: "List registrations for an event owned by organizer or visible to admin.",
        operationId: "getEventRegistrations",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId."), pageParam, limitParam(20)],
        responses: standardResponses(
          ok("Lay danh sach dang ky thanh cong", {
            type: "object",
            properties: {
              registrations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    attendeeName: { type: "string" },
                    attendeeEmail: { type: "string", format: "email" },
                    ticketType: { type: "string" },
                    createdAt: { type: "string", format: "date-time" },
                    status: { $ref: "#/components/schemas/RegistrationStatus" },
                    paymentStatus: { $ref: "#/components/schemas/PaymentStatus" },
                  },
                },
              },
              total: { type: "integer" },
              page: { type: "integer" },
              limit: { type: "integer" },
            },
          }),
        ),
      }),
    },
    "/api/v1/events/{id}/export": {
      get: operation({
        tags: ["Organizer"],
        summary: "Export event attendees CSV",
        description: "Download attendee registrations as CSV.",
        operationId: "exportEventRegistrationsCsv",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: {
          "200": {
            description: "CSV file containing attendee data.",
            headers: {
              "Content-Disposition": {
                description: "attachment filename attendees_{eventId}.csv",
                schema: { type: "string" },
              },
            },
            content: {
              "text/csv": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "401": errorRef("Unauthorized"),
          "403": errorRef("Forbidden"),
          "404": errorRef("Resource not found"),
          "500": errorRef("Internal server error"),
        },
      }),
    },
    "/api/v1/events/{id}/report": {
      get: operation({
        tags: ["Organizer"],
        summary: "Get event report",
        description: "Get ticket, revenue, attendance and review metrics for an owned event.",
        operationId: "getEventReport",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: standardResponses(
          ok("Bao cao su kien", {
            type: "object",
            properties: {
              eventId: idProperty,
              eventTitle: { type: "string" },
              totalRegistered: { type: "integer" },
              totalCheckedIn: { type: "integer" },
              attendanceRate: { type: "number" },
              totalRevenue: { type: "number" },
              avgRating: { type: "number" },
              totalReviews: { type: "integer" },
              ticketBreakdown: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    ticketTypeName: { type: "string" },
                    price: { type: "number" },
                    quota: { type: "integer" },
                    sold: { type: "integer" },
                    revenue: { type: "number" },
                  },
                },
              },
            },
          }),
        ),
      }),
    },
    "/api/v1/events/{id}/dashboard": {
      get: operation({
        tags: ["Organizer"],
        summary: "Get event realtime dashboard snapshot",
        description: "Get current registration/check-in snapshot for an event.",
        operationId: "getEventDashboard",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Event ObjectId.")],
        responses: standardResponses(ok("Dashboard snapshot")),
      }),
    },
    "/api/v1/events/{eventId}/ticket-types": {
      get: operation({
        tags: ["Ticket Types"],
        summary: "Get ticket types",
        description: "Public list of ticket types for an event.",
        operationId: "getTicketTypes",
        parameters: [objectIdParam("eventId", "Event ObjectId.")],
        responses: standardResponses(ok("Get ticket types successfully", arrayOf(ref("TicketType")))),
      }),
      post: operation({
        tags: ["Ticket Types", "Organizer"],
        summary: "Create ticket type",
        description: "Create ticket type for an owned event.",
        operationId: "createTicketType",
        security: bearerSecurity,
        parameters: [objectIdParam("eventId", "Event ObjectId.")],
        requestBody: jsonBody(ref("TicketTypeRequest")),
        responses: standardResponses(ok("Ticket type created successfully", ref("TicketType")), {
          "201": created("Ticket type created successfully", ref("TicketType")),
        }),
      }),
    },
    "/api/v1/events/{eventId}/ticket-types/{id}": {
      put: operation({
        tags: ["Ticket Types", "Organizer"],
        summary: "Update ticket type",
        description: "Update ticket type by id.",
        operationId: "updateTicketType",
        security: bearerSecurity,
        parameters: [
          objectIdParam("eventId", "Event ObjectId."),
          objectIdParam("id", "Ticket type ObjectId."),
        ],
        requestBody: jsonBody(ref("TicketTypeRequest")),
        responses: standardResponses(ok("Ticket type updated successfully", ref("TicketType"))),
      }),
      delete: operation({
        tags: ["Ticket Types", "Organizer"],
        summary: "Delete ticket type",
        description: "Delete ticket type by id.",
        operationId: "deleteTicketType",
        security: bearerSecurity,
        parameters: [
          objectIdParam("eventId", "Event ObjectId."),
          objectIdParam("id", "Ticket type ObjectId."),
        ],
        responses: standardResponses(ok("Ticket type deleted successfully")),
      }),
    },
    "/api/v1/registrations": {
      post: operation({
        tags: ["Registrations"],
        summary: "Register attendance",
        description: "Register attendee for an event and ticket type.",
        operationId: "registerAttendance",
        security: bearerSecurity,
        requestBody: jsonBody(ref("RegisterAttendanceRequest")),
        responses: standardResponses(ok("Dang ky ve su kien thanh cong", ref("RegisterAttendanceResult")), {
          "201": created("Dang ky ve su kien thanh cong", ref("RegisterAttendanceResult")),
        }),
      }),
    },
    "/api/v1/tickets/register": {
      post: operation({
        tags: ["Tickets", "Registrations"],
        summary: "Register attendance via tickets router",
        description: "Same controller as POST /api/v1/registrations.",
        operationId: "registerAttendanceFromTicketsRouter",
        security: bearerSecurity,
        requestBody: jsonBody(ref("RegisterAttendanceRequest")),
        responses: standardResponses(ok("Dang ky ve su kien thanh cong", ref("RegisterAttendanceResult")), {
          "201": created("Dang ky ve su kien thanh cong", ref("RegisterAttendanceResult")),
        }),
      }),
    },
    "/api/v1/tickets": {
      get: operation({
        tags: ["Tickets"],
        summary: "View attendance history",
        description: "List tickets for authenticated attendee.",
        operationId: "viewAttendanceHistory",
        security: bearerSecurity,
        responses: standardResponses(ok("Lich su ve cua toi", arrayOf(ref("Ticket")))),
      }),
    },
    "/api/v1/tickets/{id}": {
      get: operation({
        tags: ["Tickets"],
        summary: "View ticket detail",
        description: "Get ticket detail by id for authenticated attendee.",
        operationId: "viewTicketDetail",
        security: bearerSecurity,
        parameters: [objectIdParam("id", "Ticket ObjectId.")],
        responses: standardResponses(ok("Chi tiet ve su kien", ref("Ticket"))),
      }),
    },
    "/api/v1/tickets/{id}/calendar": {
      post: operation({
        tags: ["Tickets"],
        summary: "Google Calendar placeholder",
        description:
          "Current source returns a static JSON message and does not apply auth middleware.",
        operationId: "addTicketToCalendarPlaceholder",
        parameters: [objectIdParam("id", "Ticket ObjectId.")],
        responses: {
          "200": {
            description: "Placeholder response.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
                examples: {
                  placeholder: {
                    value: { message: "UC10 - Add to Google Calendar (OAuth2)" },
                  },
                },
              },
            },
          },
        },
      }),
    },
    "/api/v1/payments/vnpay/create": {
      post: operation({
        tags: ["Payments"],
        summary: "Create VNPay payment URL",
        description:
          "Create VNPay URL for a pending paid registration. JSON requests receive JSON; browser form requests may redirect to VNPay.",
        operationId: "createVnpayPaymentUrl",
        security: bearerSecurity,
        requestBody: jsonBody(ref("CreateVNPayPaymentRequest")),
        responses: standardResponses(ok("VNPay payment URL created successfully", ref("VNPayPaymentUrlResult")), {
          "302": { description: "Redirect to VNPay payment URL for non-JSON requests." },
        }),
      }),
    },
    "/api/v1/payments/vnpay/return": {
      get: operation({
        tags: ["Payments"],
        summary: "Handle VNPay return",
        description:
          "VNPay browser return callback. Source renders payments/payment-result EJS HTML and may issue a ticket on successful valid payment.",
        operationId: "handleVnpayReturn",
        parameters: [
          queryParam("vnp_TxnRef", { type: "string" }, "VNPay order code."),
          queryParam("vnp_ResponseCode", { type: "string" }, "VNPay response code."),
          queryParam("vnp_TransactionStatus", { type: "string" }, "VNPay transaction status."),
          queryParam("vnp_Amount", { type: "string" }, "Amount in VND multiplied by 100."),
          queryParam("vnp_TransactionNo", { type: "string" }, "Gateway transaction number."),
          queryParam("vnp_SecureHash", { type: "string" }, "VNPay secure hash."),
        ],
        responses: {
          "200": {
            description: "HTML payment result page.",
            content: {
              "text/html": { schema: { type: "string" } },
            },
          },
          "400": {
            description: "HTML payment result page for invalid checksum.",
            content: {
              "text/html": { schema: { type: "string" } },
            },
          },
        },
      }),
    },
    "/api/v1/payments/vnpay/ipn": {
      get: operation({
        tags: ["Payments"],
        summary: "Handle VNPay IPN",
        description:
          "VNPay server-to-server IPN callback. Uses query parameters and returns RspCode/Message JSON.",
        operationId: "handleVnpayIpn",
        parameters: [
          queryParam("vnp_TxnRef", { type: "string" }, "VNPay order code."),
          queryParam("vnp_ResponseCode", { type: "string" }, "VNPay response code."),
          queryParam("vnp_TransactionStatus", { type: "string" }, "VNPay transaction status."),
          queryParam("vnp_Amount", { type: "string" }, "Amount in VND multiplied by 100."),
          queryParam("vnp_TransactionNo", { type: "string" }, "Gateway transaction number."),
          queryParam("vnp_SecureHash", { type: "string" }, "VNPay secure hash."),
        ],
        responses: {
          "200": {
            description: "VNPay IPN response.",
            content: {
              "application/json": { schema: ref("VNPayIpnResponse") },
            },
          },
        },
      }),
    },
    "/api/v1/checkin/qr": {
      post: operation({
        tags: ["Check-in"],
        summary: "Process QR check-in",
        description: "Check in a ticket using decoded QR payload.",
        operationId: "processQrCheckin",
        security: bearerSecurity,
        requestBody: jsonBody(ref("QrCheckinRequest")),
        responses: standardResponses(ok("Check-in thanh cong", ref("Ticket"))),
      }),
    },
    "/api/v1/checkin/manual": {
      post: operation({
        tags: ["Check-in"],
        summary: "Process manual check-in",
        description: "Check in a ticket manually after attendee search.",
        operationId: "processManualCheckin",
        security: bearerSecurity,
        requestBody: jsonBody(ref("ManualCheckinRequest")),
        responses: standardResponses(ok("Duyet ve thanh cong", ref("Ticket"))),
      }),
    },
    "/api/v1/checkin/search": {
      get: operation({
        tags: ["Check-in"],
        summary: "Search attendee for manual check-in",
        description: "Search attendee tickets by event and keyword.",
        operationId: "searchAttendeeForCheckin",
        security: bearerSecurity,
        parameters: [
          {
            in: "query",
            name: "eventId",
            required: true,
            schema: idProperty,
            description: "Event ObjectId.",
          },
          {
            in: "query",
            name: "keyword",
            required: true,
            schema: { type: "string", minLength: 1, maxLength: 100 },
            description: "Name or email keyword.",
          },
        ],
        responses: standardResponses(ok("Truy xuat danh sach thanh cong", arrayOf(ref("Ticket")))),
      }),
    },
    "/api/v1/notifications": {
      post: operation({
        tags: ["Notifications", "Organizer"],
        summary: "Send mass notification",
        description: "Queue email notifications for attendees of an event.",
        operationId: "sendMassNotification",
        security: bearerSecurity,
        requestBody: jsonBody(ref("SendNotificationRequest")),
        responses: standardResponses(ok("Da dua vao hang doi gui thong bao")),
      }),
    },
    "/api/v1/admin/dashboard": {
      get: operation({
        tags: ["Admin"],
        summary: "Get system dashboard",
        description: "Admin-only system dashboard metrics.",
        operationId: "getAdminDashboard",
        security: bearerSecurity,
        responses: standardResponses(ok("System dashboard")),
      }),
    },
    "/api/v1/admin/events/pending": {
      get: operation({
        tags: ["Admin"],
        summary: "Get pending events",
        description: "Admin-only paginated pending events list.",
        operationId: "getPendingEvents",
        security: bearerSecurity,
        parameters: [pageParam, limitParam(10, 100), queryParam("keyword", { type: "string" }, "Optional keyword.")],
        responses: standardResponses(
          ok("Lay danh sach su kien cho duyet thanh cong", {
            type: "object",
            properties: {
              events: arrayOf(ref("Event")),
              currentPage: { type: "integer" },
              totalPages: { type: "integer" },
              totalItems: { type: "integer" },
              keyword: { type: "string" },
            },
          }),
        ),
      }),
    },
    "/api/v1/admin/events/{eventId}": {
      get: operation({
        tags: ["Admin"],
        summary: "Get event review detail",
        description: "Admin-only event detail with ticket types for review.",
        operationId: "getEventReviewDetail",
        security: bearerSecurity,
        parameters: [objectIdParam("eventId", "Event ObjectId.")],
        responses: standardResponses(
          ok("Lay chi tiet su kien thanh cong", {
            type: "object",
            properties: {
              event: { $ref: "#/components/schemas/Event" },
              ticketTypes: arrayOf(ref("TicketType")),
            },
          }),
        ),
      }),
    },
    "/api/v1/admin/events/{eventId}/approve": {
      patch: operation({
        tags: ["Admin"],
        summary: "Approve event",
        description: "Approve a pending event and notify organizer when possible.",
        operationId: "approveEvent",
        security: bearerSecurity,
        parameters: [objectIdParam("eventId", "Event ObjectId.")],
        responses: standardResponses(ok("Duyet su kien thanh cong")),
      }),
    },
    "/api/v1/admin/events/{eventId}/reject": {
      patch: operation({
        tags: ["Admin"],
        summary: "Reject event",
        description: "Reject a pending event with a reason.",
        operationId: "rejectEvent",
        security: bearerSecurity,
        parameters: [objectIdParam("eventId", "Event ObjectId.")],
        requestBody: jsonBody(ref("RejectEventRequest")),
        responses: standardResponses(ok("Tu choi su kien thanh cong")),
      }),
    },
    "/api/v1/admin/accounts": {
      get: operation({
        tags: ["Admin"],
        summary: "Get accounts",
        description: "Admin-only paginated user account list.",
        operationId: "getAccounts",
        security: bearerSecurity,
        parameters: [
          pageParam,
          limitParam(10, 100),
          queryParam("keyword", { type: "string" }, "Search by keyword."),
          queryParam("role", { type: "string", enum: ["attendee", "organizer", "staff", "admin", ""] }, "Role filter."),
          queryParam("status", { type: "string", enum: ["active", "locked", ""] }, "Account status filter."),
          queryParam("sort", { type: "string", enum: ["newest", "oldest", "name_asc", "name_desc"], default: "newest" }, "Sort order."),
        ],
        responses: standardResponses(
          ok("Lay danh sach tai khoan thanh cong", {
            type: "object",
            properties: {
              users: arrayOf(ref("PublicUser")),
              currentPage: { type: "integer" },
              totalPages: { type: "integer" },
              totalItems: { type: "integer" },
              filters: {
                type: "object",
                properties: {
                  keyword: { type: "string" },
                  role: { type: "string" },
                  status: { type: "string" },
                  sort: { type: "string" },
                },
              },
            },
          }),
        ),
      }),
    },
    "/api/v1/admin/accounts/{userId}": {
      get: operation({
        tags: ["Admin"],
        summary: "Get account detail",
        description: "Admin-only account detail.",
        operationId: "getAccountDetail",
        security: bearerSecurity,
        parameters: [objectIdParam("userId", "User ObjectId.")],
        responses: standardResponses(
          ok("Lay thong tin tai khoan thanh cong", {
            type: "object",
            properties: { account: { $ref: "#/components/schemas/PublicUser" } },
          }),
        ),
      }),
    },
    "/api/v1/admin/accounts/{userId}/lock": {
      post: operation({
        tags: ["Admin"],
        summary: "Lock account",
        description: "Lock a user account with reason.",
        operationId: "lockAccount",
        security: bearerSecurity,
        parameters: [objectIdParam("userId", "User ObjectId.")],
        requestBody: jsonBody(ref("LockAccountRequest")),
        responses: standardResponses(ok("Khoa tai khoan thanh cong")),
      }),
    },
    "/api/v1/admin/accounts/{userId}/unlock": {
      post: operation({
        tags: ["Admin"],
        summary: "Unlock account",
        description: "Unlock a locked user account.",
        operationId: "unlockAccount",
        security: bearerSecurity,
        parameters: [objectIdParam("userId", "User ObjectId.")],
        responses: standardResponses(ok("Mo khoa tai khoan thanh cong")),
      }),
    },
    "/api/v1/admin/reports/revenue": {
      get: operation({
        tags: ["Admin"],
        summary: "Get revenue report",
        description: "Admin-only revenue report with optional filters and grouping.",
        operationId: "getRevenueReport",
        security: bearerSecurity,
        parameters: [
          queryParam("startDate", { type: "string", format: "date-time" }, "Start date."),
          queryParam("endDate", { type: "string", format: "date-time" }, "End date."),
          queryParam("organizerId", idProperty, "Organizer ObjectId."),
          queryParam("category", { $ref: "#/components/schemas/EventCategory" }, "Category filter."),
          queryParam("groupBy", { type: "string", enum: ["day", "week", "month", "organizer", "category"], default: "day" }, "Report grouping."),
        ],
        responses: standardResponses(ok("Lay bao cao doanh thu thanh cong")),
      }),
    },
  },
};

export const swaggerSpec = swaggerJSDoc({
  definition: swaggerDefinition,
  apis: [],
});
