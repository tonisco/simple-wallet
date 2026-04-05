import { IsUUID, IsNumber, IsPositive } from "class-validator"
import { IDebitWalletPayload } from "@repo/types"

export class DebitWalletDto implements IDebitWalletPayload {
  @IsUUID()
  userId: string = ""

  @IsNumber()
  @IsPositive()
  amount: number = 0
}
