// SPDX-License-Identifier: MIT
// Educational project for the course Introduction to Finance. Not a real product.
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CredentialRegistry is AccessControl, Pausable {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct CredentialRecord {
        address issuer;
        address studentWallet;
        uint64 issuedAt;
        uint16 degreeCode;
        bool revoked;
    }

    mapping(bytes32 => CredentialRecord) private _records;

    event CredentialIssued(
        bytes32 indexed certHash,
        address indexed issuer,
        address indexed studentWallet,
        uint16 degreeCode
    );
    event CredentialRevoked(
        bytes32 indexed certHash,
        address indexed issuer,
        bytes32 reasonHash
    );

    error CertificateAlreadyExists(bytes32 certHash);
    error CertificateNotFound(bytes32 certHash);
    error UnauthorizedIssuer(address caller, address expectedIssuer);

    constructor(address multisigAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, multisigAdmin);
    }

    function issueCredential(
        bytes32 certHash,
        address studentWallet,
        uint16 degreeCode
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        if (_records[certHash].issuedAt != 0) revert CertificateAlreadyExists(certHash);

        _records[certHash] = CredentialRecord(
            msg.sender,
            studentWallet,
            uint64(block.timestamp),
            degreeCode,
            false
        );
        emit CredentialIssued(certHash, msg.sender, studentWallet, degreeCode);
    }

    function revokeCredential(bytes32 certHash, bytes32 reasonHash)
        external
        onlyRole(ISSUER_ROLE)
        whenNotPaused
    {
        CredentialRecord storage rec = _records[certHash];
        if (rec.issuedAt == 0) revert CertificateNotFound(certHash);
        if (rec.issuer != msg.sender) revert UnauthorizedIssuer(msg.sender, rec.issuer);

        rec.revoked = true;
        emit CredentialRevoked(certHash, msg.sender, reasonHash);
    }

    function verifyCredential(bytes32 certHash)
        external
        view
        returns (
            bool isValid,
            bool isRevoked,
            address issuer,
            uint64 issuedAt,
            uint16 degreeCode
        )
    {
        CredentialRecord memory rec = _records[certHash];
        if (rec.issuedAt == 0) return (false, false, address(0), 0, 0);
        return (!rec.revoked, rec.revoked, rec.issuer, rec.issuedAt, rec.degreeCode);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
