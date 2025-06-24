// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Helps prevent reentrant function calls.
 */
abstract contract ReentrancyGuard {
    // Status: 1 = not entered, 2 = entered
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * Prevents a contract from calling itself again before finishing the first call.
     */
    modifier nonReentrant() {
        // Check if entered
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Set to entered
        _status = _ENTERED;

        _;

        // Reset to not entered
        _status = _NOT_ENTERED;
    }
}
