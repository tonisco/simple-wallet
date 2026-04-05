import { IsUUID } from "class-validator"
import { IGetWalletPayload } from "@repo/types"

export class GetWalletDto implements IGetWalletPayload {
  @IsUUID()
  userId: string = ""
}
