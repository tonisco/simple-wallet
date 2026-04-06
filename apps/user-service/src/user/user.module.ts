import { Module } from "@nestjs/common"
import { ClientsModule, Transport } from "@nestjs/microservices"
import { UserController } from "./user.controller"
import { UserService } from "./user.service"
import { UserRepository } from "./user.repository"
import { PrismaModule } from "@repo/prisma"
import { WALLET_SERVICE_GRPC, WALLET_SERVICE_PORT } from "@repo/types"
import { join } from "path"

@Module({
  imports: [
    PrismaModule,
    ClientsModule.register([
      {
        name: WALLET_SERVICE_GRPC,
        transport: Transport.GRPC,
        options: {
          url: `localhost:${WALLET_SERVICE_PORT}`,
          package: "wallet",
          protoPath: join(__dirname, "../../../../../packages/proto/wallet.proto"),
        },
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService],
})
export class UserModule {}
