import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { MicroserviceOptions, Transport } from "@nestjs/microservices"
import { USER_SERVICE_PORT } from "@repo/types"
import { join } from "path"
import { ValidationPipe } from "@nestjs/common"
import { Logger } from "nestjs-pino"

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${USER_SERVICE_PORT}`,
      package: "user",
      protoPath: join(__dirname, "../../../packages/proto/user.proto"),
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
