import { Controller } from "@nestjs/common"
import { GrpcMethod } from "@nestjs/microservices"
import { UserService } from "./user.service"
import { CreateUserDto } from "./dto/create-user.dto"
import { GetUserDto } from "./dto/get-user.dto"

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod("UserService", "CreateUser")
  async createUser(data: CreateUserDto) {
    const user = await this.userService.createUser(data)
    return { ...user, createdAt: user.createdAt.toISOString() }
  }

  @GrpcMethod("UserService", "GetUserById")
  async getUserById(data: GetUserDto) {
    const user = await this.userService.getUserById(data)
    return { ...user, createdAt: user.createdAt.toISOString() }
  }
}
