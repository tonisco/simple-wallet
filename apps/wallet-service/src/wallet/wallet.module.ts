import { Module } from "@nestjs/common"
import { WalletController } from "./wallet.controller"
import { WalletService } from "./wallet.service"
import { WalletRepository } from "./wallet.repository"
import { PrismaModule } from "@repo/prisma"

@Module({
  imports: [PrismaModule],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService],
})
export class WalletModule {}
