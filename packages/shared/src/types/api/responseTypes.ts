import type { Request, Response } from "express";

export interface ApiResponse<T = any> {
  status: number;
  message?: string;
  data?: T;
}

export type RouteHandlerFunction<T = any> = (
  req: Request,
  res: Response,
) => Promise<T> | T;

export interface SuccessResponseOptions {
  data?: any;
  message?: string | ((result: any, req: Request) => string);
  statusCode?: number;
  meta?: any;
}

export interface RouteOptions extends SuccessResponseOptions {
  statusCode?: number;
}
