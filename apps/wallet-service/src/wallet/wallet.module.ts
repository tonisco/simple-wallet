import { Module } from "@nestjs/common"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { WalletController } from "./wallet.controller"
import { WalletService } from "./wallet.service"
import { WalletRepository } from "./wallet.repository"
import { PrismaModule } from "@repo/prisma"
import { USER_SERVICE_GRPC, USER_SERVICE_PORT } from "@repo/types"
import { join } from "path"

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: USER_SERVICE_GRPC,
        transport: Transport.GRPC,
        options: {
          url: `localhost:${USER_SERVICE_PORT}`,
          package: "user",
          protoPath: join(__dirname, "../../../packages/proto/user.proto"),
        },
      },
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService],
})
export class WalletModule {}
