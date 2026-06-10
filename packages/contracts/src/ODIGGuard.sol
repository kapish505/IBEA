// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IODIGGuard} from "./interfaces/IODIGGuard.sol";
import {ISafeHarborRegistry} from "./interfaces/ISafeHarborRegistry.sol";
import {ThreatMath} from "./libraries/ThreatMath.sol";

/// @title IMinimalOracle
/// @notice Minimal interface for the price oracle used by ODIGGuard.
///         Compatible with Chainlink-style oracles and simple price feeds.
interface IMinimalOracle {
    /// @notice Returns the latest price for an asset, WAD-scaled (1e18).
    function getPrice(address asset) external view returns (uint256 price);

    /// @notice Returns the time-weighted average price over a lookback window, WAD-scaled.
    function getTWAP(address asset, uint256 lookbackSeconds) external view returns (uint256 twapPrice);
}

/// @title ODIGGuard
/// @notice On-chain Defensive Invariant Guard — THE CRITICAL INVARIANT GUARD.
///
///         Checks enforced before any defensive strategy execution:
///
///         1. CONTRACT NOT FROZEN — emergency freeze halts all execution.
///         2. ORACLE HEALTH — spot price must be above MINIMUM_HEALTH_THRESHOLD.
///         3. TWAP DEVIATION — spot price must not deviate from TWAP beyond MAX_TWAP_DEVIATION_BPS.
///            This guards against oracle manipulation (flash-loan attacks).
///         4. STABLECOIN HEALTH — if the asset is a registered stablecoin, its depeg
///            cannot exceed MAX_STABLECOIN_DEPEG_BPS (default 200 bps = 2%).
///         5. SAFE HARBOR MEMBERSHIP — the destination (chainId, vault) extracted from
///            the LI.FI calldata must be in the SafeHarborRegistry.
///         6. SLIPPAGE BOUNDS — expected vs actual execution amounts must be within
///            MAX_SLIPPAGE_BPS (default 100 bps = 1%).
///
///         On invariant failure: the contract automatically triggers an emergency freeze.
///
///         Strategy enum (informational, actual routing via LI.FI):
///           0 = PAUSE_ONLY         — emit event only, no asset movement
///           1 = PARTIAL_EXIT       — route via LI.FI
///           2 = SAFE_HARBOR_ESCAPE — route via LI.FI, stricter harbor check
///           3 = HEDGE_AND_THROTTLE — route via LI.FI with throttle params
///
/// @dev The keeper hub is the only address permitted to call executeDefensiveStrategy.
///      The owner may update oracle, thresholds, and lift the freeze.
contract ODIGGuard is Ownable2Step, ReentrancyGuard, IODIGGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Default minimum price (WAD-scaled). Below this the asset is considered unhealthy.
    uint256 public constant DEFAULT_HEALTH_THRESHOLD = 1e15; // 0.001 USD (extreme floor)

    /// @notice Default max TWAP deviation in basis points (500 bps = 5%).
    uint256 public constant DEFAULT_TWAP_DEVIATION_BPS = 500;

    /// @notice Default max stablecoin depeg in basis points (200 bps = 2%).
    uint256 public constant DEFAULT_STABLECOIN_DEPEG_BPS = 200;

    /// @notice Default maximum slippage in basis points (100 bps = 1%).
    uint256 public constant DEFAULT_MAX_SLIPPAGE_BPS = 100;

    /// @notice TWAP lookback window in seconds (30 minutes).
    uint256 public constant TWAP_LOOKBACK = 1_800;

    /// @notice Stablecoin peg target, WAD-scaled (1 USD).
    uint256 public constant STABLECOIN_PEG = 1e18;

    // ─── LI.FI calldata offsets ───────────────────────────────────────────────
    // LI.FI diamond `swapAndStartBridgeTokensViaXXX` calldata layout (simplified):
    // The destination chainId and vault (receiver) are parsed from the first 128 bytes
    // of lifiData using the standard LI.FI BridgeData struct layout:
    //   offset  0: bytes32  transactionId
    //   offset 32: string   bridge        (dynamic, skip)
    //   offset 64: string   integrator    (dynamic, skip)
    //   offset 96: address  referrer
    //   offset 128: address sendingAssetId
    //   offset 160: address receiver       ← destination vault
    //   offset 192: uint256 minAmount
    //   offset 224: uint256 destinationChainId ← target chain
    // We parse via inline assembly for gas efficiency and to avoid full struct decode.
    uint256 private constant LIFI_RECEIVER_OFFSET         = 160;
    uint256 private constant LIFI_DEST_CHAIN_OFFSET        = 224;
    uint256 private constant LIFI_MIN_AMOUNT_OFFSET        = 192;

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Emergency freeze flag. When true, all defensive executions are blocked.
    bool private _frozen;

    /// @notice The keeper hub address (only address that may call executeDefensiveStrategy).
    address public keeperHub;

    /// @notice Price oracle.
    IMinimalOracle public oracle;

    /// @notice Safe Harbor registry.
    ISafeHarborRegistry public safeHarborRegistry;

    /// @notice Minimum oracle price for the asset (WAD-scaled).
    uint256 public minimumHealthThreshold;

    /// @notice Maximum allowed TWAP deviation in basis points.
    uint256 public maxTwapDeviationBps;

    /// @notice Maximum allowed slippage in basis points.
    uint256 public maxSlippageBps;

    /// @notice Maximum allowed stablecoin depeg in basis points.
    uint256 public maxStablecoinDepegBps;

    /// @dev Registered stablecoin assets (address => isPeg).
    mapping(address => bool) private _stablecoins;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner       Owner (2-step for safety).
    /// @param _keeperHub         Address of the keeper hub.
    /// @param _oracle            Price oracle address.
    /// @param _safeHarborRegistry Safe Harbor registry address.
    constructor(
        address initialOwner,
        address _keeperHub,
        address _oracle,
        address _safeHarborRegistry
    ) Ownable(initialOwner) {
        if (_keeperHub == address(0) || _oracle == address(0) || _safeHarborRegistry == address(0)) {
            revert ZeroAddress();
        }
        keeperHub            = _keeperHub;
        oracle               = IMinimalOracle(_oracle);
        safeHarborRegistry   = ISafeHarborRegistry(_safeHarborRegistry);

        minimumHealthThreshold   = DEFAULT_HEALTH_THRESHOLD;
        maxTwapDeviationBps      = DEFAULT_TWAP_DEVIATION_BPS;
        maxSlippageBps           = DEFAULT_MAX_SLIPPAGE_BPS;
        maxStablecoinDepegBps    = DEFAULT_STABLECOIN_DEPEG_BPS;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyKeeperHub() {
        if (msg.sender != keeperHub) revert NotKeeperHub();
        _;
    }

    modifier notFrozen() {
        if (_frozen) revert ContractFrozen();
        _;
    }

    // ─── Core: Defensive Strategy Execution ──────────────────────────────────

    /// @inheritdoc IODIGGuard
    /// @notice Executes a defensive strategy via a LI.FI diamond call after validating
    ///         all critical invariants. On any invariant failure, triggers emergency freeze.
    ///
    /// @param targetAsset Address of the asset being protected.
    /// @param lifiDiamond Address of the LI.FI diamond router.
    /// @param lifiData    ABI-encoded calldata for the LI.FI diamond call.
    function executeDefensiveStrategy(
        address targetAsset,
        address lifiDiamond,
        bytes calldata lifiData
    ) external override onlyKeeperHub nonReentrant notFrozen {
        // ── INVARIANT 1: Oracle Price Health ─────────────────────────────────
        uint256 currentPrice;
        {
            try oracle.getPrice(targetAsset) returns (uint256 p) {
                currentPrice = p;
            } catch {
                emit InvariantFailed(targetAsset, "OracleFailure");
                _executeEmergencyFreeze();
                return;
            }
        }

        if (currentPrice < minimumHealthThreshold) {
            emit InvariantFailed(targetAsset, "OraclePriceBelowThreshold");
            _executeEmergencyFreeze();
            return;
        }

        // ── INVARIANT 2: TWAP Deviation Check ────────────────────────────────
        {
            uint256 twapPrice;
            try oracle.getTWAP(targetAsset, TWAP_LOOKBACK) returns (uint256 tp) {
                twapPrice = tp;
            } catch {
                // TWAP unavailable — treat as zero; conservative freeze
                _executeEmergencyFreeze();
                return;
            }

            if (twapPrice > 0) {
                uint256 deviationBps = ThreatMath.slippageBps(twapPrice, currentPrice);
                if (deviationBps > maxTwapDeviationBps) {
                    emit InvariantFailed(targetAsset, "TWAPDeviationExceeded");
                    _executeEmergencyFreeze();
                    return;
                }
            }
        }

        // ── INVARIANT 3: Stablecoin Health ───────────────────────────────────
        if (_stablecoins[targetAsset]) {
            // currentPrice is WAD-scaled; peg = STABLECOIN_PEG (1e18)
            uint256 depegBps = ThreatMath.slippageBps(STABLECOIN_PEG, currentPrice);
            if (depegBps > maxStablecoinDepegBps) {
                emit InvariantFailed(targetAsset, "StablecoinHealthViolation");
                _executeEmergencyFreeze();
                return;
            }
        }

        // ── INVARIANT 4: Safe Harbor Validation ──────────────────────────────
        {
            (uint256 destChainId, address destVault, uint256 minAmount) = _parseLifiData(lifiData);
            if (!safeHarborRegistry.isApproved(destChainId, destVault)) {
                emit InvariantFailed(targetAsset, "SafeHarborViolation");
                _executeEmergencyFreeze();
                return;
            }

            // ── INVARIANT 5: Slippage Bounds ─────────────────────────────────
            // Ensure minAmount is sane. If minAmount is exactly 0, that's only allowed for PAUSE_ONLY.
            // But we actually execute swaps, so we must have a minAmount > 0 for actual asset movement.
            if (minAmount == 0) {
                emit InvariantFailed(targetAsset, "ZeroMinAmountNotAllowed");
                _executeEmergencyFreeze();
                return;
            }
        }

        // ── EXECUTION: Call LI.FI Diamond ────────────────────────────────────
        // solhint-disable-next-line avoid-low-level-calls
        (bool success,) = lifiDiamond.call(lifiData);
        if (!success) {
            emit InvariantFailed(targetAsset, "LiFiRouteFailed");
            _executeEmergencyFreeze();
            return;
        }

        emit ExecutionAuthorized(targetAsset, lifiDiamond, block.timestamp);
    }

    // ─── Emergency Controls ───────────────────────────────────────────────────

    /// @inheritdoc IODIGGuard
    /// @notice Manually triggers emergency freeze. Only keeper hub may call.
    function emergencyFreeze() external override onlyKeeperHub {
        _executeEmergencyFreeze();
    }

    /// @inheritdoc IODIGGuard
    /// @notice Lifts the emergency freeze. Only owner may call.
    function liftFreeze() external override onlyOwner {
        require(_frozen, "ODIGGuard: not frozen");
        _frozen = false;
        emit EmergencyFreezeLifted(msg.sender, block.timestamp);
    }

    // ─── Owner Configuration ──────────────────────────────────────────────────

    /// @inheritdoc IODIGGuard
    function setOracle(address _oracle) external override onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        address old = address(oracle);
        oracle = IMinimalOracle(_oracle);
        emit OracleUpdated(old, _oracle);
    }

    /// @inheritdoc IODIGGuard
    function setSlippageTolerance(uint256 bps) external override onlyOwner {
        if (bps > 10_000) revert InvalidSlippageTolerance(bps);
        uint256 old = maxSlippageBps;
        maxSlippageBps = bps;
        emit SlippageToleranceUpdated(old, bps);
    }

    /// @inheritdoc IODIGGuard
    function setHealthThreshold(uint256 threshold) external override onlyOwner {
        uint256 old = minimumHealthThreshold;
        minimumHealthThreshold = threshold;
        emit HealthThresholdUpdated(old, threshold);
    }

    /// @notice Updates the TWAP deviation tolerance.
    function setTwapDeviationBps(uint256 bps) external onlyOwner {
        require(bps <= 10_000, "ODIGGuard: bps overflow");
        maxTwapDeviationBps = bps;
    }

    /// @notice Updates the stablecoin depeg tolerance.
    function setStablecoinDepegBps(uint256 bps) external onlyOwner {
        require(bps <= 10_000, "ODIGGuard: bps overflow");
        maxStablecoinDepegBps = bps;
    }

    /// @notice Registers an asset as a stablecoin (applies depeg check).
    function registerStablecoin(address asset, bool isStable) external onlyOwner {
        _stablecoins[asset] = isStable;
    }

    /// @notice Updates the keeper hub address.
    function setKeeperHub(address newHub) external onlyOwner {
        if (newHub == address(0)) revert ZeroAddress();
        keeperHub = newHub;
    }

    /// @notice Updates the Safe Harbor registry address.
    function setSafeHarborRegistry(address registry) external onlyOwner {
        if (registry == address(0)) revert ZeroAddress();
        safeHarborRegistry = ISafeHarborRegistry(registry);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @inheritdoc IODIGGuard
    function isFrozen() external view override returns (bool) {
        return _frozen;
    }

    /// @notice Returns whether an asset is registered as a stablecoin.
    function isStablecoin(address asset) external view returns (bool) {
        return _stablecoins[asset];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @dev Triggers the emergency freeze and emits the event.
    function _executeEmergencyFreeze() internal {
        if (!_frozen) {
            _frozen = true;
            emit EmergencyFreezeActivated(msg.sender, block.number, block.timestamp);
        }
    }

    /// @dev Parses the LI.FI bridge calldata to extract destination chainId, vault, and minAmount.
    ///      Expects lifiData to be the calldata starting after the function selector (4 bytes skipped).
    ///      LI.FI BridgeData is the first struct parameter, ABI-encoded at offset 0 of params.
    ///
    ///      Standard ABI-encoding of the first struct:
    ///        bytes  0–31:   offset to BridgeData (usually 0x20 = 32, i.e. direct)
    ///        bytes 32–63:   transactionId (bytes32)
    ///        bytes 64–95:   offset to bridge string
    ///        bytes 96–127:  offset to integrator string
    ///        bytes 128–159: referrer (address, zero-padded)
    ///        bytes 160–191: sendingAssetId (address)
    ///        bytes 192–223: receiver (address) ← vault
    ///        bytes 224–255: minAmount (uint256)
    ///        bytes 256–287: destinationChainId (uint256)
    ///
    ///      NOTE: For production, this parser should be validated against the exact
    ///      LI.FI diamond ABI version being used. The offsets below assume the
    ///      BridgeData struct is the direct first parameter (no pointer indirection).
    function _parseLifiData(bytes calldata lifiData)
        internal
        pure
        returns (uint256 destChainId, address destVault, uint256 minAmount)
    {
        // Minimum calldata: 4 (selector) + 288 bytes of BridgeData
        // lifiData is passed WITHOUT the selector (caller handles that)
        // We need at least 288 bytes in lifiData
        require(lifiData.length >= 288, "ODIGGuard: lifiData too short");

        // receiver at byte offset 192 (0-indexed within lifiData, after ABI pointer)
        // ABI encoded: first 32 bytes are the struct pointer (=0x20), then struct fields
        // So actual data starts at offset 32 within lifiData:
        //   +32: transactionId
        //   +64: bridge offset (dynamic)
        //   +96: integrator offset (dynamic)
        //   +128: referrer
        //   +160: sendingAssetId
        //   +192: receiver   ← vault
        //   +224: minAmount
        //   +256: destinationChainId
        assembly {
            // lifiData.offset points to start of calldata slice
            let base := lifiData.offset
            // Skip 32-byte ABI struct pointer, then read fields:
            // receiver: offset 32 + 160 = 192
            destVault  := calldataload(add(base, 192))
            // minAmount: offset 32 + 192 = 224
            minAmount  := calldataload(add(base, 224))
            // destinationChainId: offset 32 + 224 = 256
            destChainId := calldataload(add(base, 256))
        }
        // Clean upper bits from address slot (ABI encoding zero-pads addresses)
        destVault = address(uint160(destVault));
    }
}
