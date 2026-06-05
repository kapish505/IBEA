// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EscalationGate.sol";

contract TriggerOnChainThreat is Script {
    function run() external {
        // We use your existing deployer PRIVATE_KEY from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        // 1. Get the deployed EscalationGate address from env
        address gateAddress = vm.envAddress("ESCALATION_GATE_ADDRESS");
        EscalationGate gate = EscalationGate(gateAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 2. Register two mock sources (to meet M=2 threshold)
        address mockSource1 = 0x1111111111111111111111111111111111111111;
        address mockSource2 = 0x2222222222222222222222222222222222222222;
        
        // Register them with a high weight
        gate.registerSource(mockSource1, 10000);
        gate.registerSource(mockSource2, 10000);
        
        vm.stopBroadcast();

        // 3. Submit a critical threat from Source 1
        vm.startBroadcast(mockSource1);
        uint256 currentEpoch = gate.currentEpoch();
        
        uint256[5] memory maxThreats = [uint256(10000), 10000, 10000, 10000, 10000];
        gate.submitThreat(currentEpoch, maxThreats);
        vm.stopBroadcast();

        // 4. Submit a critical threat from Source 2 (This triggers the Gate!)
        vm.startBroadcast(mockSource2);
        gate.submitThreat(currentEpoch, maxThreats);
        vm.stopBroadcast();

        console.log("CRITICAL THREAT INJECTED ON-CHAIN!");
    }
}
