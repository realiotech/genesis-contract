// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

/**
 * @dev {ERC20} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and pauser
 * roles, as well as the default admin role, which will let it grant both minter
 * and pauser roles to other accounts.
 */
contract xRIO is Context, AccessControlEnumerable, ERC20Burnable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public maxSupply; // 50M RIO
    bool public locked;
    event FlipLock(bool isLocked, address user);

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE` and `PAUSER_ROLE` to the
     * account that deploys the contract.
     *
     * See {ERC20-constructor}.
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(MINTER_ROLE, _msgSender());
        maxSupply = 50000000 ether;
        locked = true;
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     *
     * See {ERC20-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address to, uint256 amount) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "xRIO: must have minter role to mint");
        require(totalSupply() < maxSupply, "xRIO: total supply has been reached");
        require(!locked, "xRIO: contract is locked");
        if (amount + totalSupply() > maxSupply) {
            amount = maxSupply - totalSupply();
        }
        _mint(to, amount);
    }

    function setMinter(address account) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "xRIO setMinter: must be an admin");
        _setupRole(MINTER_ROLE, account);
    }

    function flipLock() public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "xRIO flipLock: must be an admin");
        locked = !locked;
        emit FlipLock(locked, _msgSender());
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
