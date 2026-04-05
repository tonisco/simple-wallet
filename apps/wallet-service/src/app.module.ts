import { Module } from "@nestjs/common"
import { LoggerModule } from "nestjs-pino"
import { WalletModule } from "./wallet/wallet.module"
import { PrismaModule } from "@repo/prisma"

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: { level: process.env.LOG_LEVEL ?? "info" },
    }),
    PrismaModule,
    WalletModule,
  ],
})
export class AppModule {}
