# SchellingPointVotes Smart Contract

## Overview
Custom voting contract using WebAuthn passkeys for identity and ephemeral signers for UX.

## Key Features
- Uses RIP-7212 P256 precompile at `0x0000000000000000000000000000000000000100`
- Dual signature scheme: R1 (passkey) for authorization, K1 (EOA) for voting
- Nonce-based replay protection per identity
- Expiring signer authorizations

## Contract ABI

```solidity
// Authorize an ephemeral signer with passkey signature
function authorizeSigner(
    uint256[2] pubKey,     // passkey X,Y coordinates
    address signer,         // ephemeral wallet address
    uint256 expiry,         // unix timestamp
    uint256[2] signature    // WebAuthn signature r,s
) external

// Cast a vote with ephemeral signer signature
function vote(
    uint256[2] pubKey,      // passkey X,Y coordinates
    address signer,          // authorized ephemeral wallet
    uint256 topicId,         // session ID
    uint256 amount,          // vote amount
    uint256[2] signature     // ECDSA signature r,s
) external

// Get current nonce for a passkey
function getNonce(uint256[2] pubKey) view returns (uint256)

// Check signer authorization (returns expiry timestamp)
function signers(bytes32 identityHash, address signer) view returns (uint256)
```

## Network Compatibility
- **Base Sepolia** (chain 84532): Full support
- **Base Mainnet** (chain 8453): Full support
- **Local Anvil**: Requires storage manipulation or Base fork

## Gas Costs
- Authorization: ~80k gas ≈ $0.0001
- Vote: ~50k gas ≈ $0.0001

## Contract Size
4,731 bytes (well under 24KB limit)

## Identity Hash
```solidity
identityHash = keccak256(abi.encodePacked(pubKeyX, pubKeyY))
```
Computed on the fly, not stored separately.

## Storage Layout
- `signers[identityHash][signerAddress] => expiry`
- `nonces[identityHash] => uint256`

## Events
- `SignerAuthorized(bytes32 identityHash, address signer, uint256 expiry)`
- `Vote(bytes32 identityHash, uint256 topicId, uint256 amount)`

## Deployment
- Configuration: `foundry.toml` with Base Sepolia RPC
- Solc: 0.8.30, EVM: "cancun"
- Scripts: `Deploy.s.sol`, `deploy.sh`
- Requires: PRIVATE_KEY env var, Base Sepolia ETH
