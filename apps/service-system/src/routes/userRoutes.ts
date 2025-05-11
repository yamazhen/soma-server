import { Database } from "@soma-ms/shared";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { QueryResult } from "pg";
import type { User } from "../models/User.js";

const router = Router();

router.get(
  "/api/users/findAll",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result: QueryResult<User> = await Database.query(
        "SELECT * FROM users",
      );
      res.json({ success: true, data: result.rows });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/api/users/save",
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("Received request body:", req.body);
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          error: "Username, email, and password are required",
        });
      }
      const result: QueryResult<User> = await Database.query(
        "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
        [username, email, password],
      );
      return res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (e) {
      if (e instanceof Error && e.message.includes("unique constraint")) {
        return res.status(409).json({
          success: false,
          error: "User with this email or username already exists",
        });
      }
      return next(e);
    }
  },
);

export default router;
