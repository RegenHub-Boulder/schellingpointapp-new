# Environment Variables

## Frontend (NEXT_PUBLIC_*)
```bash
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_CONTRACT_ADDRESS=<schelling-point-votes-address>
```

## Backend (Server-side only)
```bash
# Supabase
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

# Blockchain
BASE_RPC_URL=https://sepolia.base.org  # or mainnet
RELAYER_PRIVATE_KEY=<private-key-for-tx-relay>
CONTRACT_ADDRESS=<schelling-point-votes-address>
```

## Smart Contract Deployment
```bash
PRIVATE_KEY=<deployer-private-key>
BASESCAN_API_KEY=<for-verification>
```

## Notes
- Relayer wallet needs Base ETH for gas
- Service role key never exposed to frontend
- Base Sepolia faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
