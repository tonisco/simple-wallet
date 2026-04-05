import { Module } from "@nestjs/common"
import { LoggerModule } from "nestjs-pino"
import { UserModule } from "./user/user.module"

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { level: process.env.LOG_LEVEL ?? "info" },
    }),
    UserModule,
  ],
})
export class AppModule {}
