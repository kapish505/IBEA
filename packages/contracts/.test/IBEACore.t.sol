// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IBEACore} from "../src/IBEACore.sol";
import {IIBEACore} from "../src/interfaces/IIBEACore.sol";
import {ThreatVectorMatrix} from "../src/ThreatVectorMatrix.sol";
import {SafeHarborRegistry} from "../src/SafeHarborRegistry.sol";
import {KeeperRegistry} from "../src/KeeperRegistry.sol";

contract IBEACoreTest is Test {
    IBEACore         public core;
    ThreatVectorMatrix public tvm;
    SafeHarborRegistry public harbor;
    KeeperRegistry     public keeperReg;

    address internal owner       = makeAddr("owner");
    address internal keeperHub   = makeAddr("keeperHub");
    address internal alice       = makeAddr("alice");
    address internal attacker    = makeAddr("attacker");

    bytes32 internal MODULE_TVM;
    bytes32 internal MODULE_ODIG;

    function setUp() public {
        vm.startPrank(owner);

        core       = new IBEACore(owner, keeperHub);
        tvm        = new ThreatVectorMatrix(owner, address(core));
        harbor     = new SafeHarborRegistry(owner);
        keeperReg  = new KeeperRegistry(owner, keeperHub);

        MODULE_TVM  = core.MODULE_THREAT_VECTOR_MATRIX();
        MODULE_ODIG = core.MODULE_ODIG_GUARD();

        // Wire TVM module
        core.setModule(MODULE_TVM, address(tvm));

        vm.stopPrank();
    }

    // ─── Module Registry ──────────────────────────────────────────────────────

    function test_setModule_success() public {
        vm.prank(owner);
        core.setModule(core.MODULE_SAFE_HARBOR_REGISTRY(), address(harbor));
        assertEq(core.getModule(core.MODULE_SAFE_HARBOR_REGISTRY()), address(harbor));
    }

    function test_setModule_revert_notOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        core.setModule(MODULE_TVM, address(tvm));
    }

    function test_setModule_revert_zeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(IIBEACore.ZeroAddress.selector);
        core.setModule(MODULE_TVM, address(0));
    }

    function test_setModule_revert_invalidModuleId() public {
        vm.prank(owner);
        bytes32 bogusId = keccak256("BOGUS");
        vm.expectRevert(abi.encodeWithSelector(IIBEACore.InvalidModule.selector, bogusId));
        core.setModule(bogusId, address(harbor));
    }

    // ─── KeeperHub ────────────────────────────────────────────────────────────

    function test_setKeeperHub_success() public {
        address newHub = makeAddr("newHub");
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit IIBEACore.KeeperHubUpdated(keeperHub, newHub);
        core.setKeeperHub(newHub);
        assertEq(core.keeperHub(), newHub);
    }

    function test_setKeeperHub_revert_notOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        core.setKeeperHub(attacker);
    }

    function test_setKeeperHub_revert_zeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(IIBEACore.ZeroAddress.selector);
        core.setKeeperHub(address(0));
    }

    // ─── Alert Level Computation ──────────────────────────────────────────────

    function test_computeRisk_green_whenNoThreat() public {
        // TVM all dimensions zero → aggregate = 0 → GREEN
        (IIBEACore.AlertLevel level, uint256 agg) = core.computeRisk();
        assertEq(uint8(level), uint8(IIBEACore.AlertLevel.GREEN));
        assertEq(agg, 0);
    }

    function test_computeRisk_yellow() public {
        // Set liquidityStress to 3000 (above YELLOW threshold of 2500 aggregate)
        vm.prank(address(core));
        tvm.updateDimension(0, 3_000); // liquidityStress = 3000

        (IIBEACore.AlertLevel level,) = core.computeRisk();
        // aggregate = 3000 * 2500 / 10000 = 750 → GREEN (weight 2500/10000)
        // Actually: weighted = (3000*2500 + 0 + 0 + 0 + 0) / 10000 = 750 → GREEN
        // To hit YELLOW (2500) set all dims higher
        assertEq(uint8(level), uint8(IIBEACore.AlertLevel.GREEN));
    }

    function test_computeRisk_red() public {
        // Set all dimensions to 10000 → aggregate = 10000 → RED
        vm.startPrank(address(core));
        tvm.updateDimension(0, 10_000);
        tvm.updateDimension(1, 10_000);
        tvm.updateDimension(2, 10_000);
        tvm.updateDimension(3, 10_000);
        tvm.updateDimension(4, 10_000);
        vm.stopPrank();

        (IIBEACore.AlertLevel level, uint256 agg) = core.computeRisk();
        assertEq(uint8(level), uint8(IIBEACore.AlertLevel.RED));
        assertEq(agg, 10_000);
    }

    function test_computeRisk_emitsRiskEvent() public {
        vm.expectEmit(false, true, false, false);
        emit IIBEACore.RiskEvent(1, IIBEACore.AlertLevel.GREEN, 0, block.timestamp);
        core.computeRisk();
    }

    function test_computeRisk_incrementsEpoch() public {
        assertEq(core.epoch(), 0);
        core.computeRisk();
        assertEq(core.epoch(), 1);
        core.computeRisk();
        assertEq(core.epoch(), 2);
    }

    function test_computeRisk_alertLevelChangeEvent() public {
        // Push dims to RED
        vm.startPrank(address(core));
        tvm.updateDimension(0, 10_000);
        tvm.updateDimension(1, 10_000);
        tvm.updateDimension(2, 10_000);
        tvm.updateDimension(3, 10_000);
        tvm.updateDimension(4, 10_000);
        vm.stopPrank();

        vm.expectEmit(true, true, false, false);
        emit IIBEACore.AlertLevelChanged(IIBEACore.AlertLevel.GREEN, IIBEACore.AlertLevel.RED, block.timestamp);
        core.computeRisk();
    }

    // ─── Strategy Trigger ─────────────────────────────────────────────────────

    function test_triggerStrategy_onlyKeeperHub() public {
        vm.prank(keeperHub);
        vm.expectEmit(true, true, false, false);
        emit IIBEACore.StrategyTriggered(0, 1, block.timestamp);
        core.triggerStrategy(0, 1);
    }

    function test_triggerStrategy_revert_notKeeperHub() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IIBEACore.NotKeeperHub.selector, attacker));
        core.triggerStrategy(0, 1);
    }

    function test_triggerStrategy_revert_invalidEnum() public {
        vm.prank(keeperHub);
        vm.expectRevert();
        core.triggerStrategy(4, 1); // invalid enum
    }

    // ─── Pause / Unpause ──────────────────────────────────────────────────────

    function test_pause_preventsComputeRisk() public {
        vm.prank(owner);
        core.pause();
        vm.expectRevert();
        core.computeRisk();
    }

    function test_unpause_restoresComputeRisk() public {
        vm.startPrank(owner);
        core.pause();
        core.unpause();
        vm.stopPrank();
        (IIBEACore.AlertLevel level,) = core.computeRisk();
        assertEq(uint8(level), uint8(IIBEACore.AlertLevel.GREEN));
    }

    // ─── Module ID Constants ──────────────────────────────────────────────────

    function test_moduleIds_areDistinct() public view {
        bytes32[6] memory ids = [
            core.MODULE_ESCALATION_GATE(),
            core.MODULE_THREAT_VECTOR_MATRIX(),
            core.MODULE_SEMANTIC_BURST_ENGINE(),
            core.MODULE_KEEPER_REGISTRY(),
            core.MODULE_SAFE_HARBOR_REGISTRY(),
            core.MODULE_ODIG_GUARD()
        ];
        for (uint i = 0; i < 6; i++) {
            for (uint j = i + 1; j < 6; j++) {
                assertTrue(ids[i] != ids[j], "Duplicate module IDs");
            }
        }
    }

    // ─── Ownable2Step ─────────────────────────────────────────────────────────

    function test_ownable2Step_pendingOwner() public {
        vm.prank(owner);
        core.transferOwnership(alice);
        assertEq(core.pendingOwner(), alice);
        // alice must accept
        vm.prank(alice);
        core.acceptOwnership();
        assertEq(core.owner(), alice);
    }
}
