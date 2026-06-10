// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SROCoordinator.sol";

contract DeploySRO is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        SROCoordinator sro = new SROCoordinator(deployerAddress, 0x77F6dC5924652e32DBa0B4329De0a44a2C95691E);

        vm.stopBroadcast();

        console.log("SRO Coordinator deployed at:", address(sro));
    }
}
