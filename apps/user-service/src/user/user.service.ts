import { Injectable, Inject, OnModuleInit, Logger } from "@nestjs/common"
import { RpcException } from "@nestjs/microservices"
import type { ClientGrpc } from "@nestjs/microservices"
import { UserRepository } from "./user.repository"
import { CreateUserDto } from "./dto/create-user.dto"
import { GetUserDto } from "./dto/get-user.dto"
import { User } from "@prisma/client"
import { DomainError, WALLET_SERVICE_GRPC, ErrorMapper } from "@repo/types"
import { firstValueFrom, Observable } from "rxjs"

interface IWalletServiceGrpc {
  CreateWallet(data: { userId: string }): Observable<any>
}

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name)
  private walletService!: IWalletServiceGrpc

  constructor(
    private readonly userRepository: UserRepository,
    @Inject(WALLET_SERVICE_GRPC) private walletClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.walletService = this.walletClient.getService<IWalletServiceGrpc>("WalletService")
  }

  async createUser(payload: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(payload.email)
    console.log(existing)
    if (existing) {
      throw new RpcException(ErrorMapper(DomainError.USER_ALREADY_EXISTS))
    }
    const user = await this.userRepository.createUser(payload)

    console.log(user)

    try {
      await firstValueFrom(this.walletService.CreateWallet({ userId: user.id }))
    } catch (err) {
      // Known limitation: If the wallet service fails or is down, the user is still created.
      // We don't have a distributed transaction, so we just log the error.
      this.logger.error({ err, userId: user.id }, "Failed to auto-create wallet for new user")
    }

    return user
  }

  async getUserById(payload: GetUserDto): Promise<User> {
    const user = await this.userRepository.findById(payload.id)
    if (!user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
      throw new RpcException(ErrorMapper(DomainError.USER_NOT_FOUND))
    }
    return user
  }
}
