pragma solidity ^0.8.0;


interface IERC20 {

    function balanceOf(address account) external view returns (uint256);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
}
