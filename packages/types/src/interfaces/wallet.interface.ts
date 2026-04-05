export interface IWallet {
  id: string
  userId: string
  balance: number
  createdAt: Date
}
export interface ICreateWalletPayload {
  userId: string
}
export interface IGetWalletPayload {
  userId: string
}
export interface ICreditWalletPayload {
  userId: string
  amount: number
}
export interface IDebitWalletPayload {
  userId: string
  amount: number
}
export interface IWalletResponse {
  wallet: IWallet
}
