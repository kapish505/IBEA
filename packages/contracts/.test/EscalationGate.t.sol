// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EscalationGate.sol";

contract EscalationGateTest is Test {
    EscalationGate public gate;
    address public coreAddress = address(0x123);

    function setUp() public {
        gate = new EscalationGate();
        gate.setCore(coreAddress);
    }

    function test_submitSignal_validatesConsensus() public {
        uint256 protocolId = 1;
        
        vm.prank(address(0x1));
        gate.submitSignal(protocolId, 0, 8000, "telemetry_hash");
        assertFalse(gate.isEscalated(protocolId));

        vm.prank(address(0x2));
        vm.expectEmit(true, false, false, false);
        emit EscalationGate.EscalationTriggered(protocolId, 2, 2, block.timestamp);
        gate.submitSignal(protocolId, 0, 8100, "telemetry_hash_2");
        
        assertTrue(gate.isEscalated(protocolId));
    }
}
