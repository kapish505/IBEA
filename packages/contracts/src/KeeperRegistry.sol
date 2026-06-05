// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title KeeperRegistry
/// @notice Registry of approved keeper addresses.
///         Keepers are trusted off-chain bots that may trigger defensive
///         strategies on behalf of the IBEA system.
///         The `onlyKeeperHub` modifier is provided for downstream contracts
///         to restrict critical actions to the registered KeeperHub address.
contract KeeperRegistry is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;

    // ─── Events ───────────────────────────────────────────────────────────────

    event KeeperAdded(address indexed keeper);
    event KeeperRemoved(address indexed keeper);
    event KeeperHubSet(address indexed oldHub, address indexed newHub);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error KeeperAlreadyRegistered(address keeper);
    error KeeperNotRegistered(address keeper);
    error ZeroAddress();
    error NotKeeperHub(address caller);

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice The hub address authorised to dispatch keeper actions.
    ///         This is typically IBEACore or an automated dispatcher.
    address public keeperHub;

    EnumerableSet.AddressSet private _keepers;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param initialOwner  Owner of this registry.
    /// @param initialHub    Initial keeper hub address.
    constructor(address initialOwner, address initialHub) Ownable(initialOwner) {
        if (initialHub == address(0)) revert ZeroAddress();
        keeperHub = initialHub;
        emit KeeperHubSet(address(0), initialHub);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    /// @notice Restricts callers to the registered KeeperHub address.
    modifier onlyKeeperHub() {
        if (msg.sender != keeperHub) revert NotKeeperHub(msg.sender);
        _;
    }

    // ─── Owner Functions ──────────────────────────────────────────────────────

    /// @notice Adds an approved keeper.
    /// @param keeper Address of the keeper bot to register.
    function addKeeper(address keeper) external onlyOwner {
        if (keeper == address(0)) revert ZeroAddress();
        if (!_keepers.add(keeper)) revert KeeperAlreadyRegistered(keeper);
        emit KeeperAdded(keeper);
    }

    /// @notice Removes an approved keeper.
    /// @param keeper Address to deregister.
    function removeKeeper(address keeper) external onlyOwner {
        if (!_keepers.remove(keeper)) revert KeeperNotRegistered(keeper);
        emit KeeperRemoved(keeper);
    }

    /// @notice Updates the keeper hub address.
    /// @param newHub New hub address.
    function setKeeperHub(address newHub) external onlyOwner {
        if (newHub == address(0)) revert ZeroAddress();
        address old = keeperHub;
        keeperHub = newHub;
        emit KeeperHubSet(old, newHub);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /// @notice Returns true if `keeper` is registered.
    function isKeeper(address keeper) external view returns (bool) {
        return _keepers.contains(keeper);
    }

    /// @notice Returns the number of registered keepers.
    function keeperCount() external view returns (uint256) {
        return _keepers.length();
    }

    /// @notice Returns the keeper at index `i` in the enumerable set.
    function keeperAt(uint256 i) external view returns (address) {
        return _keepers.at(i);
    }

    /// @notice Returns all registered keeper addresses.
    function allKeepers() external view returns (address[] memory) {
        return _keepers.values();
    }
}
