// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockOracle
/// @notice A mock oracle for testnet to supply pricing data to ODIGGuard.
contract MockOracle is Ownable {
    mapping(address => uint256) private _prices;
    mapping(address => uint256) private _twaps;

    constructor() Ownable(msg.sender) {}

    /// @notice Returns the latest price for an asset, WAD-scaled (1e18).
    function getPrice(address asset) external view returns (uint256 price) {
        price = _prices[asset];
        require(price > 0, "MockOracle: price not set");
    }

    /// @notice Returns the time-weighted average price over a lookback window, WAD-scaled.
    function getTWAP(address asset, uint256 /* lookbackSeconds */) external view returns (uint256 twapPrice) {
        twapPrice = _twaps[asset];
        if (twapPrice == 0) {
            twapPrice = _prices[asset]; // Fallback to spot price
        }
        require(twapPrice > 0, "MockOracle: twap not set");
    }

    /// @notice Sets the mocked spot price for an asset.
    function setPrice(address asset, uint256 price) external onlyOwner {
        _prices[asset] = price;
    }

    /// @notice Sets the mocked TWAP price for an asset.
    function setTWAP(address asset, uint256 twapPrice) external onlyOwner {
        _twaps[asset] = twapPrice;
    }
}
