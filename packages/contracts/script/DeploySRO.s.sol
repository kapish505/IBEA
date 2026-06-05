// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SROCoordinator.sol";

contract DeploySRO is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);

        // Dummy addresses for Somnia Native Agents
        address jsonApiAgent = deployerAddress;
        address webParseAgent = deployerAddress;
        address predictiveAgent = deployerAddress;

        vm.startBroadcast(deployerPrivateKey);

        SROCoordinator sro = new SROCoordinator(deployerAddress);
        
        // Register agents
        sro.setAgents(jsonApiAgent, webParseAgent, predictiveAgent);

        vm.stopBroadcast();

        console.log("SRO Coordinator deployed at:", address(sro));
        console.log("JSON API Agent:", jsonApiAgent);
        console.log("Web Parse Agent:", webParseAgent);
        console.log("Predictive Agent:", predictiveAgent);
    }
}
