// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC1363} from "@openzeppelin/contracts/token/ERC20/extensions/ERC1363.sol";
import {IOpenFund} from "./interfaces/IOpenFund.sol";

/// @notice Demo issuance token. A LAK reference is not a reserve or redemption guarantee.
contract OFLToken is ERC1363 {
    error UnauthorizedIssuer();
    error InvalidProtocol();
    error ProtectedIngress();
    error AlreadyProtected();
    address public immutable issuer;
    mapping(address => bool) public protectedFunds;

    // This permission exists only between transferAndCall entry and _update, never in a callback.
    address private ingressFrom;
    address private ingressTo;
    uint256 private ingressAmount;

    event ProtectedFundRegistered(address indexed protocol, uint256 indexed chainId);
    event Mint(address indexed recipient, uint256 amount);
    event Burn(address indexed holder, uint256 amount);

    constructor(address issuer_) ERC20("OpenFund Laos", "OFL") {
        if (issuer_ == address(0)) revert InvalidProtocol();
        issuer = issuer_;
    }

    function registerProtectedFund(address protocol) external {
        if (msg.sender != issuer) revert UnauthorizedIssuer();
        if (protectedFunds[protocol]) revert AlreadyProtected();
        if (protocol.code.length == 0 || balanceOf(protocol) != 0) revert InvalidProtocol();
        // A handshake reduces accidental griefing, but a malicious issuer can register a mimic.
        if (
            !IOpenFund(protocol).isOpenFundProtocol() || IOpenFund(protocol).oflToken() != address(this)
                || IOpenFund(protocol).deploymentChainId() != block.chainid
        ) revert InvalidProtocol();
        protectedFunds[protocol] = true;
        emit ProtectedFundRegistered(protocol, block.chainid);
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != issuer) revert UnauthorizedIssuer();
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit Burn(msg.sender, amount);
    }

    function transferAndCall(address to, uint256 value, bytes memory data) public override returns (bool) {
        if (protectedFunds[to]) {
            if (data.length != 32 || ingressTo != address(0)) revert ProtectedIngress();
            ingressFrom = _msgSender();
            ingressTo = to;
            ingressAmount = value;
        }
        return super.transferAndCall(to, value, data);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (protectedFunds[to]) {
            if (from == address(0) || from != ingressFrom || to != ingressTo || value != ingressAmount) {
                revert ProtectedIngress();
            }
            // Consume BEFORE token movement and BEFORE any receiver callback.
            delete ingressFrom;
            delete ingressTo;
            delete ingressAmount;
        }
        super._update(from, to, value);
    }
}
