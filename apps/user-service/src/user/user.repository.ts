import { Injectable } from "@nestjs/common"
import { PrismaService } from "@repo/prisma"
import { Prisma, User } from "@prisma/client"

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data })
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }
}
