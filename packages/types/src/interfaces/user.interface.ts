export interface IUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
export interface ICreateUserPayload {
  email: string;
  name: string;
}
export interface IGetUserByIdPayload {
  id: string;
}
