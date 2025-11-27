import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { existsSync, readFileSync } from "fs";
import path, { join } from "path";
import { DbConfig } from "../config/db.config";
const sslCert = join(process.cwd(), "us-east-2-bundle.pem");
@Module({
  providers: [],
  exports: [],
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [DbConfig],
      useFactory: (config: DbConfig) => ({
        type: "postgres",
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        entities: [path.join(__dirname, "entities/*.entity{.ts,.js}")],
        synchronize: false,
        logging: false,
        autoLoadEntities: false,
        useUTC: true,
        ...(existsSync(sslCert)
          ? {
              ssl: {
                rejectUnauthorized: true,
                ca: readFileSync(sslCert).toString(),
              },
            }
          : {
              // ssl: {
              //   rejectUnauthorized: false,
              // },
            }),
      }),
    }),
  ],
})
export class DatabaseModule {}
