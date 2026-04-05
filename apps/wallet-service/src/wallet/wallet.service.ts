import { Injectable, Inject, OnModuleInit } from "@nestjs/common"
import { RpcException } from "@nestjs/microservices"
import type { ClientGrpc } from "@nestjs/microservices"
import { status } from "@grpc/grpc-js"
import { WalletRepository } from "./wallet.repository"
import { CreateWalletDto } from "./dto/create-wallet.dto"
import { GetWalletDto } from "./dto/get-wallet.dto"
import { CreditWalletDto } from "./dto/credit-wallet.dto"
import { DebitWalletDto } from "./dto/debit-wallet.dto"
import { Wallet } from "@prisma/client"
import { DomainError, USER_SERVICE_GRPC } from "@repo/types"
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
      if ((err as { code?: number })?.code === status.NOT_FOUND) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: DomainError.USER_NOT_FOUND,
        })
      }
      throw err
    }

    const existing = await this.walletRepository.findByUserId(payload.userId)
    if (existing) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: DomainError.WALLET_ALREADY_EXISTS,
      })
    }
    return this.walletRepository.createWallet(payload.userId)
  }

  async getWallet(payload: GetWalletDto): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(payload.userId)
    if (!wallet) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: DomainError.WALLET_NOT_FOUND,
      })
    }
    return wallet
  }

  async creditWallet(payload: CreditWalletDto): Promise<Wallet> {
    const wallet = await this.walletRepository.findByUserId(payload.userId)
    if (!wallet) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: DomainError.WALLET_NOT_FOUND,
      })
    }
    return this.walletRepository.creditWallet(payload.userId, payload.amount)
  }

  async debitWallet(payload: DebitWalletDto): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: payload.userId } })
      if (!wallet) {
        throw new RpcException({
          code: status.NOT_FOUND,
          message: DomainError.WALLET_NOT_FOUND,
        })
      }
      if (wallet.balance.lessThan(payload.amount)) {
        throw new RpcException({
          code: status.FAILED_PRECONDITION,
          message: DomainError.INSUFFICIENT_BALANCE,
        })
      }
      return tx.wallet.update({
        where: { userId: payload.userId },
        data: { balance: { decrement: payload.amount } },
      })
    })
  }
}
