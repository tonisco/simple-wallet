import { Injectable } from "@nestjs/common"
import { RpcException } from "@nestjs/microservices"
import { status } from "@grpc/grpc-js"
import { UserRepository } from "./user.repository"
import { CreateUserDto } from "./dto/create-user.dto"
import { GetUserDto } from "./dto/get-user.dto"
import { User } from "@prisma/client"
import { DomainError } from "@repo/types"

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(payload: CreateUserDto): Promise<User> {
    const existing = await this.userRepository.findByEmail(payload.email)
    if (existing) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: DomainError.USER_ALREADY_EXISTS,
      })
    }
    return this.userRepository.createUser(payload)
  }

  async getUserById(payload: GetUserDto): Promise<User> {
    const user = await this.userRepository.findById(payload.id)
    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: DomainError.USER_NOT_FOUND,
      })
    }
    return user
  }
}
