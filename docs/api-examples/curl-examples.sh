#!/usr/bin/env bash
# =============================================================================
# Microservice Wallet System — gRPC API Examples
# =============================================================================
# Prerequisites:
#   - grpcurl installed: https://github.com/fullstorydev/grpcurl/releases
#   - User Service running on  localhost:50051
#   - Wallet Service running on localhost:50052
#   - Both services started with: pnpm turbo run start:dev
# =============================================================================

USER_HOST="localhost:50051"
WALLET_HOST="localhost:50052"

echo ""
echo "========================================================"
echo " Microservice Wallet System — API Test Suite"
echo "========================================================"

# ─────────────────────────────────────────────────────────────
# FLOW 1: CreateUser (happy path)
# Auto-creates a wallet for the new user.
# Expected: 200 with id, email, name, createdAt
# ─────────────────────────────────────────────────────────────
echo ""
echo "[1/11] CreateUser — happy path"
CREATE_USER_RESPONSE=$(grpcurl -plaintext \
  -d '{"email":"alice@example.com","name":"Alice"}' \
  $USER_HOST user.UserService/CreateUser)
echo "$CREATE_USER_RESPONSE"

# Extract the user ID for subsequent calls
USER_ID=$(echo "$CREATE_USER_RESPONSE" | grep -o '"id": "[^"]*"' | head -1 | cut -d'"' -f4)
echo "  → Captured userId: $USER_ID"

# ─────────────────────────────────────────────────────────────
# FLOW 2: CreateUser — duplicate email
# Expected: ERROR code = ALREADY_EXISTS (6), message = USER_ALREADY_EXISTS
# ─────────────────────────────────────────────────────────────
echo ""
echo "[2/11] CreateUser — duplicate email → ALREADY_EXISTS"
grpcurl -plaintext \
  -d '{"email":"alice@example.com","name":"Alice Duplicate"}' \
  $USER_HOST user.UserService/CreateUser

# ─────────────────────────────────────────────────────────────
# FLOW 3: GetUserById — happy path
# Expected: 200 with user fields
# ─────────────────────────────────────────────────────────────
echo ""
echo "[3/11] GetUserById — happy path"
grpcurl -plaintext \
  -d "{\"id\":\"$USER_ID\"}" \
  $USER_HOST user.UserService/GetUserById

# ─────────────────────────────────────────────────────────────
# FLOW 4: GetUserById — non-existent ID
# Expected: ERROR code = NOT_FOUND (5), message = USER_NOT_FOUND
# ─────────────────────────────────────────────────────────────
echo ""
echo "[4/11] GetUserById — non-existent ID → NOT_FOUND"
grpcurl -plaintext \
  -d '{"id":"00000000-0000-0000-0000-000000000000"}' \
  $USER_HOST user.UserService/GetUserById

# ─────────────────────────────────────────────────────────────
# FLOW 5: GetWallet — happy path
# Wallet auto-created when user was created.
# Expected: 200 with id, userId, balance=0, createdAt
# ─────────────────────────────────────────────────────────────
echo ""
echo "[5/11] GetWallet — happy path (auto-created with user)"
grpcurl -plaintext \
  -d "{\"userId\":\"$USER_ID\"}" \
  $WALLET_HOST wallet.WalletService/GetWallet

# ─────────────────────────────────────────────────────────────
# FLOW 6: CreditWallet — happy path
# Expected: 200 with updated balance (0 + 250.00 = 250.00)
# ─────────────────────────────────────────────────────────────
echo ""
echo "[6/11] CreditWallet — happy path (+250.00)"
grpcurl -plaintext \
  -d "{\"userId\":\"$USER_ID\",\"amount\":250.00}" \
  $WALLET_HOST wallet.WalletService/CreditWallet

# ─────────────────────────────────────────────────────────────
# FLOW 7: CreditWallet — negative amount
# Expected: ERROR code = INVALID_ARGUMENT (3), message = INVALID_AMOUNT
# ─────────────────────────────────────────────────────────────
echo ""
echo "[7/11] CreditWallet — negative amount → INVALID_ARGUMENT"
grpcurl -plaintext \
  -d "{\"userId\":\"$USER_ID\",\"amount\":-50}" \
  $WALLET_HOST wallet.WalletService/CreditWallet

# ─────────────────────────────────────────────────────────────
# FLOW 8: DebitWallet — happy path
# Current balance: 250.00. Debit 75.00 → new balance: 175.00
# Expected: 200 with updated balance
# ─────────────────────────────────────────────────────────────
echo ""
echo "[8/11] DebitWallet — happy path (-75.00)"
grpcurl -plaintext \
  -d "{\"userId\":\"$USER_ID\",\"amount\":75.00}" \
  $WALLET_HOST wallet.WalletService/DebitWallet

# ─────────────────────────────────────────────────────────────
# FLOW 9: DebitWallet — insufficient balance
# Current balance: 175.00. Try to debit 999.00.
# Expected: ERROR code = FAILED_PRECONDITION (9), message = INSUFFICIENT_BALANCE
# ─────────────────────────────────────────────────────────────
echo ""
echo "[9/11] DebitWallet — insufficient balance → FAILED_PRECONDITION"
grpcurl -plaintext \
  -d "{\"userId\":\"$USER_ID\",\"amount\":999.00}" \
  $WALLET_HOST wallet.WalletService/DebitWallet

# ─────────────────────────────────────────────────────────────
# FLOW 10: DebitWallet — non-existent user
# Expected: ERROR code = NOT_FOUND (5), message = WALLET_NOT_FOUND
# ─────────────────────────────────────────────────────────────
echo ""
echo "[10/11] DebitWallet — non-existent user → NOT_FOUND"
grpcurl -plaintext \
  -d '{"userId":"00000000-0000-0000-0000-000000000000","amount":10}' \
  $WALLET_HOST wallet.WalletService/DebitWallet

# ─────────────────────────────────────────────────────────────
# FLOW 11: CreateWallet — non-existent userId
# Wallet Service calls User Service to verify userId before creation.
# Expected: ERROR code = NOT_FOUND (5), message = USER_NOT_FOUND
# ─────────────────────────────────────────────────────────────
echo ""
echo "[11/11] CreateWallet — non-existent userId → NOT_FOUND (inter-service check)"
grpcurl -plaintext \
  -d '{"userId":"00000000-0000-0000-0000-000000000000"}' \
  $WALLET_HOST wallet.WalletService/CreateWallet

echo ""
echo "========================================================"
echo " All flows complete."
echo "========================================================"
