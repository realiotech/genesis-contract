// SPDX-License-Identifier: MIT

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IERC1155Mintable.sol";
import "./IERC20.sol";


pragma solidity ^0.8.0;

contract Genesis is Ownable, ReentrancyGuard {
    // Mapping from address to stakerInfoMap
    // @dev see StakerInfo struct
    mapping(address => StakerInfo) private _stakerInfoMap;

    struct StakerInfo {
        uint256 amount; // staked tokens
        bool claimedNFT; // boolean if user has claimed NFT
    }

    // events
    event Stake(address indexed staker, uint256 amount);
    event Lock(address indexed user);
    event Unlock(address indexed user);
    event Claim(address indexed user);
    event RemoveStake(address indexed staker, uint256 amount);
    event GenesisUnlocked(address indexed user);

    // contract interfaces
    IERC20 rio; // RIO token
    IERC20 xRio; // xRIO token
    IERC1155Mintable realioNFTContract; // Realio NFT Factory contract

    // contract level vars
    address _stakingContractAddress; // Realio LP contract address
    uint256 public stakedSupply; // Supply of genesis tokens available
    uint256 public whaleThreshold; // Threshold for NFT claim
    bool public locked; // contract is locked no staking
    bool public networkGenesis; // realio network launch complete

    constructor() public {
        locked = true;
        networkGenesis = false;
        setWhaleThreshold(10000 ether); // 10,000 RIO
    }

    function init(address _stakingContractAddress, address _xRIOContractAddress, address _rioContractAddress) public onlyOwner {
        setStakingContractAddress(_stakingContractAddress);
        setxRIOToken(_xRIOContractAddress);
        setRIOToken(_rioContractAddress);
        flipLock();
    }

    function setWhaleThreshold(uint256 amount) public onlyOwner {
        whaleThreshold = amount;
    }

    function setRealioNFTContract(address a) public onlyOwner {
        realioNFTContract = IERC1155Mintable(a);
    }

    function setStakingContractAddress(address a) public onlyOwner {
        _stakingContractAddress = a;
    }

    function setRIOToken(address _rioAddress) public onlyOwner {
        rio = IERC20(_rioAddress);
    }

    function setxRIOToken(address _xrioAddress) public onlyOwner {
        xRio = IERC20(_xrioAddress);
    }

    function setNetworkGenesis() public onlyOwner {
        networkGenesis = true;
        emit GenesisUnlocked(_msgSender());
    }

    function flipLock() public onlyOwner {
        locked = !locked;
    }

    function updateStakeHolding(address staker, uint256 amount) internal {
        StakerInfo storage stakerInfo = _stakerInfoMap[staker];
        uint256 stakedBal = stakerInfo.amount;
        stakerInfo.amount = amount + stakedBal;
    }

    function stake(uint256 amount) public nonReentrant {
        // staker must approve the stake amount to be controlled by the genesis contract
        require(!locked, "Genesis contract is locked");
        require(rio.balanceOf(_msgSender()) >= amount, "Sender does not have enough RIO");
        // solidity 0.8 now includes SafeMath as default; overflows not an issue
        uint256 amountShare = amount / 2;
        uint256 mintAmount = calculateMintAmount(amount);
        rio.transferFrom(_msgSender(), _stakingContractAddress, amountShare);
        rio.burnFrom(_msgSender(), amountShare);
        xRio.mint(_msgSender(), mintAmount);
        stakedSupply = stakedSupply + amount;
        updateStakeHolding(_msgSender(), amount);
        emit Stake(_msgSender(), amount);
    }

    // determine the appropriate bonus share based on stakedSupply and users staked amount
    // if newSupply crossed a tier threshold calculate appropriate bonusShare
    function calculateMintAmount(uint256 amount) internal view returns (uint256) {
        uint256 tierOne = 100000 ether; // 100,000 RIO
        uint256 tierTwo = 500000 ether; // 500,000 RIO
        uint256 bonusShare = 0;
        uint256 newSupply = stakedSupply + amount;
        if (newSupply < tierOne) {
            // tierOne stake level
            bonusShare = amount * 3;
        } else if (newSupply < tierTwo) {
            // tierTwo stake level
            if (stakedSupply < tierOne) {
                // check if staked amount crosses tierOne threshold
                // ie stakedSupply + user staked amount crosses tierOne
                uint256 partialShare = 0;
                uint256 overflowShare = 0;
                partialShare = tierOne - stakedSupply;
                overflowShare = newSupply - tierOne;
                bonusShare = (partialShare * 3) + (overflowShare * 2);
            } else {
                bonusShare = amount * 2;
            }
        } else {
            if (stakedSupply < tierTwo) {
                // check if staked amount crosses tierTwo threshold
                // ie stakedSupply + user staked amount crosses tierTwo
                uint256 partialShare = 0;
                uint256 overflowShare = 0;
                partialShare = tierTwo - stakedSupply;
                overflowShare = newSupply - tierTwo;
                bonusShare = (partialShare * 2) + (overflowShare + (overflowShare/2));
            } else {
                bonusShare = amount + (amount/2);
            }
        }
        return bonusShare;
    }

    // allow any whales that have staked to receive an NFT at Genesis
    function claim() public nonReentrant {
        require(hasClaim(_msgSender()), "sender has no NFT claim");
        if (_stakerInfoMap[_msgSender()].amount >= whaleThreshold) {
            realioNFTContract.create(_msgSender(), 1, '');
            _stakerInfoMap[_msgSender()].claimedNFT = true;
        }
        emit Claim(_msgSender());
    }

    // check if the account has an NFT claim
    function hasClaim(address _to) internal view returns (bool) {
        return !_stakerInfoMap[_to].claimedNFT && _stakerInfoMap[_to].amount > whaleThreshold;
    }

    function getStakedBalance() public view returns (uint256) {
        return _stakerInfoMap[_msgSender()].amount;
    }

    function getStakedBalanceForAddress(address staker) public view returns (uint256) {
        return _stakerInfoMap[staker].amount;
    }

    function getStakingContractAddress() public view virtual returns (address) {
        return _stakingContractAddress;
    }
}
