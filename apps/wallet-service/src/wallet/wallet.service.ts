import { Injectable, Inject, OnModuleInit } from "@nestjs/common"
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
  private userService!: IUserServiceGrpc
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly prisma: PrismaService,
    @Inject(USER_SERVICE_GRPC) private userClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userService = this.userClient.getService<IUserServiceGrpc>("UserService")
  }

  async createWallet(payload: CreateWalletDto): Promise<Wallet> {
    try {
      await firstValueFrom(this.userService.GetUserById({ id: payload.userId }))
    } catch (err) {
      // Only remap NOT_FOUND as USER_NOT_FOUND.
      // Other codes (UNAVAILABLE, INTERNAL, DEADLINE_EXCEEDED) propagate as-is.
      if ((err as { code: number })?.code === 5 /* grpc NOT_FOUND */) {
        throw new RpcException(ErrorMapper(DomainError.USER_NOT_FOUND))
      }
      throw err
    }

    const existing = await this.walletRepository.findByUserId(payload.userId)
    if (existing) {
      throw new RpcException(ErrorMapper(DomainError.WALLET_ALREADY_EXISTS))
    }
    return this.walletRepository.createWallet(payload.userId)
  }

  async getWallet(payload: GetWalletDto): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(payload.userId)
    if (!wallet) {
      throw new RpcException(ErrorMapper(DomainError.WALLET_NOT_FOUND))
    }
    return wallet
  }

  async creditWallet(payload: CreditWalletDto): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(payload.userId)
    if (!wallet) {
      throw new RpcException(ErrorMapper(DomainError.WALLET_NOT_FOUND))
    }
    return this.walletRepository.creditWallet(payload.userId, payload.amount)
  }

  async debitWallet(payload: DebitWalletDto): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: payload.userId } })
      if (!wallet) {
        throw new RpcException(ErrorMapper(DomainError.WALLET_NOT_FOUND))
      }
      if (wallet.balance < payload.amount) {
        throw new RpcException(ErrorMapper(DomainError.INSUFFICIENT_BALANCE))
      }
      return tx.wallet.update({
        where: { userId: payload.userId },
        data: { balance: { decrement: payload.amount } },
      })
    })
  }
}
