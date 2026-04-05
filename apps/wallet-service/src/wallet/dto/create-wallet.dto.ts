import { IsUUID } from "class-validator"
import { ICreateWalletPayload } from "@repo/types"

export class CreateWalletDto implements ICreateWalletPayload {
  @IsUUID()
  userId: string = ""
}
