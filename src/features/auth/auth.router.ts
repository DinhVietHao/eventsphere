import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../../shared/middlewares/auth.middleware";

const authRouter = Router();
const authController = new AuthController();

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.post("/logout", authMiddleware, authController.logout);
authRouter.get("/verify-email", authController.verifyEmail);
authRouter.post("/forgot-password", authController.forgotPassword);
authRouter.post("/reset-password", authController.resetPassword);

// Profile routes — yêu cầu đăng nhập
authRouter.get("/me", authMiddleware, authController.getMe);
authRouter.patch("/me", authMiddleware, authController.updateMe);
authRouter.patch(
  "/change-password",
  authMiddleware,
  authController.changePassword,
);

export default authRouter;
