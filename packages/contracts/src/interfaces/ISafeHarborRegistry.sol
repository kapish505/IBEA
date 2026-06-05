// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ISafeHarborRegistry
/// @notice Interface for the approved (chainId, vaultAddress) Safe Harbor registry.
interface ISafeHarborRegistry {
    // ─── Events ───────────────────────────────────────────────────────────────

    event HarborAdded(uint256 indexed chainId, address indexed vault);
    event HarborRemoved(uint256 indexed chainId, address indexed vault);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error HarborAlreadyApproved(uint256 chainId, address vault);
    error HarborNotFound(uint256 chainId, address vault);
    error ZeroAddress();

    // ─── Functions ────────────────────────────────────────────────────────────

    function addHarbor(uint256 chainId, address vault) external;
    function removeHarbor(uint256 chainId, address vault) external;
    function isApproved(uint256 chainId, address vault) external view returns (bool);
    function approvedHarbors() external view returns (uint256 count);
}
