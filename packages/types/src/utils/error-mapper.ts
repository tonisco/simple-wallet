import { DomainError } from "../enums/grpc-status.enum"

// standard gRPC status codes
const GrpcStatus = {
  INVALID_ARGUMENT: 3,
  NOT_FOUND: 5,
  ALREADY_EXISTS: 6,
  FAILED_PRECONDITION: 9,
}

export const ErrorMapper = (domainError: DomainError): { code: number; message: string } => {
  const map: Record<DomainError, number> = {
    [DomainError.USER_NOT_FOUND]: GrpcStatus.NOT_FOUND,
    [DomainError.WALLET_NOT_FOUND]: GrpcStatus.NOT_FOUND,
    [DomainError.WALLET_ALREADY_EXISTS]: GrpcStatus.ALREADY_EXISTS,
    [DomainError.INSUFFICIENT_BALANCE]: GrpcStatus.FAILED_PRECONDITION,
    [DomainError.INVALID_AMOUNT]: GrpcStatus.INVALID_ARGUMENT,
    [DomainError.USER_ALREADY_EXISTS]: GrpcStatus.ALREADY_EXISTS,
  }

  return {
    code: map[domainError] || 2, // 2 is UNKNOWN
    message: domainError,
  }
}
