import { Controller } from "@nestjs/common"
import { GrpcMethod } from "@nestjs/microservices"
import { WalletService } from "./wallet.service"
import { CreateWalletDto } from "./dto/create-wallet.dto"
import { GetWalletDto } from "./dto/get-wallet.dto"
import { CreditWalletDto } from "./dto/credit-wallet.dto"
import { DebitWalletDto } from "./dto/debit-wallet.dto"

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @GrpcMethod("WalletService", "CreateWallet")
  async createWallet(data: CreateWalletDto) {
    const wallet = await this.walletService.createWallet(data)
    return { ...wallet, balance: Number(wallet.balance), createdAt: wallet.createdAt.toISOString() }
  }

  @GrpcMethod("WalletService", "GetWallet")
  async getWallet(data: GetWalletDto) {
    const wallet = await this.walletService.getWallet(data)
    return { ...wallet, balance: Number(wallet.balance), createdAt: wallet.createdAt.toISOString() }
  }

  @GrpcMethod("WalletService", "CreditWallet")
  async creditWallet(data: CreditWalletDto) {
    const wallet = await this.walletService.creditWallet(data)
    return { ...wallet, balance: Number(wallet.balance), createdAt: wallet.createdAt.toISOString() }
  }

  @GrpcMethod("WalletService", "DebitWallet")
  async debitWallet(data: DebitWalletDto) {
    const wallet = await this.walletService.debitWallet(data)
    return { ...wallet, balance: Number(wallet.balance), createdAt: wallet.createdAt.toISOString() }
  }
}
