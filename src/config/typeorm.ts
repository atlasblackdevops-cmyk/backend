import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import path, { join } from "path";
import { DataSource } from "typeorm";
const sslCert = join(process.cwd(), "us-east-2-bundle.pem");

config({ path: ".env" });

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: process.env.DB_PORT as unknown as number,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [path.join(__dirname, "../database/entities/*.entity{.ts,.js}")],
  migrations: [path.join(__dirname, "../database/migrations/*{.ts,.js}")],
  synchronize: false,
  useUTC: true,
  logging: false,
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
});

export default dataSource;
