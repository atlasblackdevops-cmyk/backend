import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { FastifyRequest } from "fastify";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();

    const httpAdapter = this.httpAdapterHost.httpAdapter;

    const status: number =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const data: any =
      exception instanceof HttpException
        ? typeof exception.getResponse() === "string"
          ? { message: exception.getResponse() }
          : {
              message: (exception.getResponse() as any).message,
              errors: (exception.getResponse() as any).errors,
            }
        : {
            message: "Sorry, something went wrong there. Try again.",
          };

    // Log the full error for debugging (only log stack trace for non-HTTP exceptions)
    if (exception instanceof HttpException) {
      console.error("HTTP EXCEPTION:", {
        status: exception.getStatus(),
        message: exception.message,
        response: exception.getResponse(),
        path: request.url,
        method: request.method,
      });
    } else {
      console.error("INTERNAL SERVER ERROR:", {
        error: exception,
        message:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
        path: request.url,
        method: request.method,
      });
    }

    const responseBody = {
      success: false,
      statusCode: status,
      ...data,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }
}
