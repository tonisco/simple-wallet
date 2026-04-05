import { IsUUID } from "class-validator"
import { IGetUserByIdPayload } from "@repo/types"

export class GetUserDto implements IGetUserByIdPayload {
  @IsUUID()
  id: string = ""
}
