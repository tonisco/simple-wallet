import { NestFactory } from "@nestjs/core"
import { MicroserviceOptions, Transport } from "@nestjs/microservices"
import { AppModule } from "./app.module"
import { WALLET_SERVICE_PORT } from "@repo/types"
import { ValidationPipe } from "@nestjs/common"
import { Logger } from "nestjs-pino"
import { join } from "path"

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${WALLET_SERVICE_PORT}`,
      package: "wallet",
      protoPath: join(__dirname, "../../../../packages/proto/wallet.proto"),
    },
  })

  app.useLogger(app.get(Logger))
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))

  await app.listen()
}
bootstrap().catch((error) => {
  console.error(error)
  process.exit(1)
})
