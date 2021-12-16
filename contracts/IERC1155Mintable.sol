pragma solidity ^0.8.0;

interface IERC1155Mintable {
    function create(
        address to,
        uint256 amount,
        bytes memory _data
    ) external returns (uint256);
}
