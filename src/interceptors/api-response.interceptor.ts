import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { FastifyReply } from "fastify";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  statusCode: number;
  message?: string;
  data: T;
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const _context = context.switchToHttp();
    const response = _context.getResponse<FastifyReply>();

    return next.handle().pipe(
      map((payload: any) => {
        const message: string | undefined = payload?.message;
        const data =
          payload && Object.prototype.hasOwnProperty.call(payload, "data")
            ? payload.data
            : payload;

        return {
          success: true,
          statusCode: response.statusCode,
          message,
          data,
        };
      }),
    );
  }
}
