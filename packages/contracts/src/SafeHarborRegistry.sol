// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISafeHarborRegistry} from "./interfaces/ISafeHarborRegistry.sol";

/// @title SafeHarborRegistry
/// @notice Maintains the canonical allowlist of (chainId, vaultAddress) pairs that
///         the ODIG guard may route funds to in a defensive action.
///         Only the owner may modify the registry; all reads are public.
contract SafeHarborRegistry is Ownable, ISafeHarborRegistry {
    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev chainId => vault => approved
    mapping(uint256 => mapping(address => bool)) private _approved;

    /// @notice Total number of approved harbor entries.
    uint256 private _count;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner Address that will own the registry.
    constructor(address initialOwner) Ownable(initialOwner) {}

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /// @inheritdoc ISafeHarborRegistry
    function addHarbor(uint256 chainId, address vault) external override onlyOwner {
        if (vault == address(0)) revert ZeroAddress();
        if (_approved[chainId][vault]) revert HarborAlreadyApproved(chainId, vault);
        _approved[chainId][vault] = true;
        unchecked { _count++; }
        emit HarborAdded(chainId, vault);
    }

    /// @inheritdoc ISafeHarborRegistry
    function removeHarbor(uint256 chainId, address vault) external override onlyOwner {
        if (!_approved[chainId][vault]) revert HarborNotFound(chainId, vault);
        _approved[chainId][vault] = false;
        unchecked { _count--; }
        emit HarborRemoved(chainId, vault);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @inheritdoc ISafeHarborRegistry
    function isApproved(uint256 chainId, address vault) external view override returns (bool) {
        return _approved[chainId][vault];
    }

    /// @inheritdoc ISafeHarborRegistry
    function approvedHarbors() external view override returns (uint256 count) {
        count = _count;
    }
}
