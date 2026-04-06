import { Injectable, Inject, OnModuleInit, Logger } from "@nestjs/common"
import { RpcException } from "@nestjs/microservices"
import type { ClientGrpc } from "@nestjs/microservices"
import { UserRepository } from "./user.repository"
import { CreateUserDto } from "./dto/create-user.dto"
import { GetUserDto } from "./dto/get-user.dto"
import { User, Wallet } from "@prisma/client"
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
    this.logger.log("WalletService gRPC client initialized")
  }

  async createUser(payload: CreateUserDto): Promise<User> {
    this.logger.log(`CreateUser called — email=${payload.email}`)

    const existing = await this.userRepository.findByEmail(payload.email)
    if (existing) {
      this.logger.warn(`CreateUser rejected — duplicate email=${payload.email}`)
      throw new RpcException(ErrorMapper(DomainError.USER_ALREADY_EXISTS))
    }

    const user = await this.userRepository.createUser(payload)
    this.logger.log(`User created — id=${user.id} email=${user.email}`)

    this.logger.log(`Triggering wallet creation for userId=${user.id}`)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const wallet: Wallet | undefined = await firstValueFrom(this.walletService.CreateWallet({ userId: user.id }))
      this.logger.log(`Wallet auto-created — walletId=${wallet?.id} userId=${user.id}`)
    } catch (err) {
      // Known limitation: If the wallet service fails or is down, the user is still created.
      // We don't have a distributed transaction, so we just log the error.
      this.logger.error(
        `Failed to auto-create wallet for userId=${user.id} — user was still persisted`,
        (err as Error)?.stack,
      )
    }

    return user
  }

  async getUserById(payload: GetUserDto): Promise<User> {
    this.logger.log(`GetUserById called — id=${payload.id}`)
    const user = await this.userRepository.findById(payload.id)
    if (!user) {
      this.logger.warn(`GetUserById — user not found id=${payload.id}`)
      throw new RpcException(ErrorMapper(DomainError.USER_NOT_FOUND))
    }
    this.logger.log(`GetUserById — found user id=${user.id} email=${user.email}`)
    return user
  }
}
