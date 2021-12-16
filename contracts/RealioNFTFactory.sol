// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

abstract contract OwnableDelegateProxy {}

abstract contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

/**
 * @dev {ERC1155} token, including:
 *  - ability to create many types of tokens both fungible and non-fungible
 *  - configured to support OpenSea (owner, approvals, proxy registry)
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *  - a pauser role that allows to stop all token transfers
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and pauser
 * roles, as well as the default admin role, which will let it grant both minter
 * and pauser roles to other accounts.
 */
contract RealioNFTFactory is Context, AccessControlEnumerable, ERC1155Burnable, ERC1155Pausable, Ownable {
    using Strings for string;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // proxy registry for gas free OpenSea listings
    address proxyRegistryAddress;
    // track current token id
    uint256 private _currentTokenID = 0;
    // track token supplies
    mapping (uint256 => uint256) public tokenSupply;

    // Contract name
    string public name = "Realio NFT Collectibles";
    // Contract symbol
    string public symbol = "RealioNFT";
    event Create(address user, uint256 tokenId, uint256 amount);

    /**
     * @dev Grants `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, and `PAUSER_ROLE` to the account that
     * deploys the contract.
     */
    constructor(string memory _uri, address proxyAddress) ERC1155(_uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());
        proxyRegistryAddress = proxyAddress;
    }

    /**
     @dev Allows setting of minter role by the contract owner
     */
    function setMinterRole(address minterAddress) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "RealioNFTFactory: must have admin role to set minter");
        _setupRole(MINTER_ROLE, minterAddress);
    }

    /**
    * @dev Returns the total quantity for a token ID
    * @param _id uint256 ID of the token to query
    * @return amount of token in existence
    */
    function totalSupply(
        uint256 _id
    ) public view returns (uint256) {
        return tokenSupply[_id];
    }

    /**
      * @dev Creates a new token type and assigns to an address
      * create a new token; sends tokens to address
      * - non-fungible 1/1 token - set amount to 1
      * - fungible x/100 token - set amount to 100
      * @param to address of the first owner of the token
      * @param amount amount to supply the first owner
      * @param data Data to pass if receiver is contract
      * @return The newly created token ID
      */
    function create(
        address to,
        uint256 amount,
        bytes memory data
    ) external returns (uint256) {
        require(hasRole(MINTER_ROLE, _msgSender()), "RealioNFTFactory: must have minter role to create");

        uint256 _id = _getNextTokenID();
        _incrementTokenTypeId();

        _mint(to, _id, amount, data);
        tokenSupply[_id] = amount;
        emit Create(to, _id, amount);
        return _id;
    }

    /**
     * @dev Creates `amount` new tokens for `to`, of token type `id`.
     *
     * See {ERC1155-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "RealioNFTFactory: must have minter role to mint");
        _mint(to, id, amount, data);
        tokenSupply[id] = tokenSupply[id] + amount;
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] variant of {mint}.
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "RealioNFTFactory: must have minter role to mint");
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            tokenSupply[id] = tokenSupply[id] + amount;
        }

        _mintBatch(to, ids, amounts, data);
    }

    /**
     * @dev Pauses all token transfers.
     *
     * See {ERC1155Pausable} and {Pausable-_pause}.
     *
     * Requirements:
     *
     * - the caller must have the `PAUSER_ROLE`.
     */
    function pause() public virtual {
        require(hasRole(PAUSER_ROLE, _msgSender()), "RealioNFTFactory: must have pauser role to pause");
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * See {ERC1155Pausable} and {Pausable-_unpause}.
     *
     * Requirements:
     *
     * - the caller must have the `PAUSER_ROLE`.
     */
    function unpause() public virtual {
        require(hasRole(PAUSER_ROLE, _msgSender()), "RealioNFTFactory: must have pauser role to unpause");
        _unpause();
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlEnumerable, ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155, ERC1155Pausable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function setURI(string memory newuri) internal virtual {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "RealioNFTFactory: must have admin role to set uri");
        super._setURI(newuri);
    }

    function uri(uint256 _tokenId) public view virtual override returns (string memory) {
        string memory baseUri = super.uri(_tokenId);
        return string(abi.encodePacked(baseUri, Strings.toString(_tokenId)));
    }

    /**
     * Override isApprovedForAll approve OpenSea (ProxyRegistry) as operator
     */
    function isApprovedForAll(address owner, address operator) public view virtual override(ERC1155) returns (bool)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
    * @dev calculates the next token ID based on value of _currentTokenID
    * @return uint256 for the next token ID
    */
    function _getNextTokenID() private view returns (uint256) {
        return _currentTokenID + 1;
    }

    /**
      * @dev increments the value of _currentTokenID
      */
    function _incrementTokenTypeId() private  {
        _currentTokenID++;
    }

    function withdraw() public onlyOwner payable {
        payable(_msgSender()).transfer(address(this).balance);
    }
}
