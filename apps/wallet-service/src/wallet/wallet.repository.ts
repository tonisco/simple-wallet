import { Injectable } from "@nestjs/common"
import { PrismaService } from "@repo/prisma"
import { Wallet } from "@prisma/client"

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWallet(userId: string): Promise<Wallet> {
    return this.prisma.wallet.create({
      data: { userId, balance: 0 },
    })
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { userId },
    })
  }

  async creditWallet(userId: string, amount: number): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amount } },
    })
  }
}
