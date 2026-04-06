import { Injectable, Inject, OnModuleInit, Logger } from "@nestjs/common"
import { RpcException } from "@nestjs/microservices"
import type { ClientGrpc } from "@nestjs/microservices"
import { WalletRepository } from "./wallet.repository"
import { CreateWalletDto } from "./dto/create-wallet.dto"
import { GetWalletDto } from "./dto/get-wallet.dto"
import { CreditWalletDto } from "./dto/credit-wallet.dto"
import { DebitWalletDto } from "./dto/debit-wallet.dto"
import { Wallet } from "@prisma/client"
import { DomainError, USER_SERVICE_GRPC, ErrorMapper } from "@repo/types"
import { PrismaService } from "@repo/prisma"
import { firstValueFrom, Observable } from "rxjs"

interface IUserServiceGrpc {
  GetUserById(data: { id: string }): Observable<any>
}

@Injectable()
export class WalletService implements OnModuleInit {
  private readonly logger = new Logger(WalletService.name)
  private userService!: IUserServiceGrpc

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly prisma: PrismaService,
    @Inject(USER_SERVICE_GRPC) private userClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userService = this.userClient.getService<IUserServiceGrpc>("UserService")
    this.logger.log("UserService gRPC client initialized")
  }

  async createWallet(payload: CreateWalletDto): Promise<Wallet> {
    this.logger.log(`CreateWallet called — userId=${payload.userId}`)

    this.logger.log(`Verifying user exists — userId=${payload.userId}`)
    try {
      await firstValueFrom(this.userService.GetUserById({ id: payload.userId }))
      this.logger.log(`User verified — userId=${payload.userId}`)
    } catch (err) {
      // Only remap NOT_FOUND as USER_NOT_FOUND.
      // Other codes (UNAVAILABLE, INTERNAL, DEADLINE_EXCEEDED) propagate as-is.
      if ((err as { code: number })?.code === 5 /* grpc NOT_FOUND */) {
        this.logger.warn(`CreateWallet rejected — user not found userId=${payload.userId}`)
        throw new RpcException(ErrorMapper(DomainError.USER_NOT_FOUND))
      }
      this.logger.error(`CreateWallet — unexpected error verifying userId=${payload.userId}`, (err as Error)?.stack)
      throw err
    }

    const existing = await this.walletRepository.findByUserId(payload.userId)
    if (existing) {
      this.logger.warn(`CreateWallet rejected — wallet already exists for userId=${payload.userId}`)
      throw new RpcException(ErrorMapper(DomainError.WALLET_ALREADY_EXISTS))
    }

    const wallet = await this.walletRepository.createWallet(payload.userId)
    this.logger.log(`Wallet created — id=${wallet.id} userId=${wallet.userId} balance=${wallet.balance}`)
    return wallet
  }

  async getWallet(payload: GetWalletDto): Promise<Wallet> {
    this.logger.log(`GetWallet called — userId=${payload.userId}`)
    const wallet = await this.walletRepository.findByUserId(payload.userId)
    if (!wallet) {
      this.logger.warn(`GetWallet — wallet not found for userId=${payload.userId}`)
      throw new RpcException(ErrorMapper(DomainError.WALLET_NOT_FOUND))
    }
    this.logger.log(`GetWallet — found wallet id=${wallet.id} balance=${wallet.balance}`)
    return wallet
  }

  async creditWallet(payload: CreditWalletDto): Promise<Wallet> {
    this.logger.log(`CreditWallet called — userId=${payload.userId} amount=${payload.amount}`)
    const wallet = await this.walletRepository.findByUserId(payload.userId)
    if (!wallet) {
      this.logger.warn(`CreditWallet — wallet not found for userId=${payload.userId}`)
      throw new RpcException(ErrorMapper(DomainError.WALLET_NOT_FOUND))
    }
    const updated = await this.walletRepository.creditWallet(payload.userId, payload.amount)
    this.logger.log(`CreditWallet — success userId=${payload.userId} newBalance=${updated.balance}`)
    return updated
  }

  async debitWallet(payload: DebitWalletDto): Promise<Wallet> {
    this.logger.log(`DebitWallet called — userId=${payload.userId} amount=${payload.amount}`)
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: payload.userId } })
      if (!wallet) {
        this.logger.warn(`DebitWallet — wallet not found for userId=${payload.userId}`)
        throw new RpcException(ErrorMapper(DomainError.WALLET_NOT_FOUND))
      }
      if (wallet.balance < payload.amount) {
        this.logger.warn(
          `DebitWallet — insufficient balance userId=${payload.userId} balance=${wallet.balance} requested=${payload.amount}`,
        )
        throw new RpcException(ErrorMapper(DomainError.INSUFFICIENT_BALANCE))
      }
      const updated = await tx.wallet.update({
        where: { userId: payload.userId },
        data: { balance: { decrement: payload.amount } },
      })
      this.logger.log(`DebitWallet — success userId=${payload.userId} newBalance=${updated.balance}`)
      return updated
    })
  }
}
