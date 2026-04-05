import { IsEmail, IsNotEmpty, IsString } from "class-validator"
import { ICreateUserPayload } from "@repo/types"

export class CreateUserDto implements ICreateUserPayload {
  @IsEmail()
  @IsNotEmpty()
  email: string = ""

  @IsString()
  @IsNotEmpty()
  name: string = ""
}
