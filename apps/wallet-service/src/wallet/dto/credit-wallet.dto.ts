import { IsUUID, IsNumber, IsPositive } from "class-validator"
import { ICreditWalletPayload } from "@repo/types"

export class CreditWalletDto implements ICreditWalletPayload {
  @IsUUID()
  userId: string = ""

  @IsNumber()
  @IsPositive()
  amount: number = 0
}
