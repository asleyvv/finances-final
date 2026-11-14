const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let registry, multisigAdmin, universityA, universityB, student, outsider;
  let issuerRole;

  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("Diploma_Test_Student_001_Salt987"));
  const degreeCode = 101; // B.Sc. Software Engineering

  beforeEach(async function () {
    [multisigAdmin, universityA, universityB, student, outsider] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("CredentialRegistry");
    registry = await Registry.deploy(multisigAdmin.address);
    await registry.waitForDeployment();

    issuerRole = await registry.ISSUER_ROLE();
  });

  it("1. Assigns DEFAULT_ADMIN_ROLE exclusively to multisigAdmin on deployment", async function () {
    const adminRole = await registry.DEFAULT_ADMIN_ROLE();
    expect(await registry.hasRole(adminRole, multisigAdmin.address)).to.be.true;
    expect(await registry.hasRole(adminRole, outsider.address)).to.be.false;
  });

  it("2. Allows multisigAdmin to onboard an accredited university with ISSUER_ROLE", async function () {
    await expect(registry.connect(multisigAdmin).grantRole(issuerRole, universityA.address))
      .to.emit(registry, "RoleGranted");
    expect(await registry.hasRole(issuerRole, universityA.address)).to.be.true;
  });

  it("3. Allows an authorized university to issue a unique diploma hash", async function () {
    await registry.connect(multisigAdmin).grantRole(issuerRole, universityA.address);

    await expect(registry.connect(universityA).issueCredential(sampleHash, student.address, degreeCode))
      .to.emit(registry, "CredentialIssued")
      .withArgs(sampleHash, universityA.address, student.address, degreeCode);
  });

  it("4. Prevents duplicate issuance of an already registered certificate hash", async function () {
    await registry.connect(multisigAdmin).grantRole(issuerRole, universityA.address);
    await registry.connect(universityA).issueCredential(sampleHash, student.address, degreeCode);

    await expect(
      registry.connect(universityA).issueCredential(sampleHash, student.address, degreeCode)
    ).to.be.revertedWithCustomError(registry, "CertificateAlreadyExists");
  });

  it("5. Blocks unauthorized external wallets from issuing credentials", async function () {
    await expect(
      registry.connect(outsider).issueCredential(sampleHash, student.address, degreeCode)
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("6. Allows gas-free instant verification by any employer", async function () {
    await registry.connect(multisigAdmin).grantRole(issuerRole, universityA.address);
    await registry.connect(universityA).issueCredential(sampleHash, student.address, degreeCode);

    const [isValid, isRevoked, issuer, issuedAt, code] =
      await registry.connect(outsider).verifyCredential(sampleHash);

    expect(isValid).to.be.true;
    expect(isRevoked).to.be.false;
    expect(issuer).to.equal(universityA.address);
    expect(issuedAt).to.be.greaterThan(0);
    expect(code).to.equal(degreeCode);
  });

  it("7. Enforces cross-issuer isolation and allows valid revocation by original issuer", async function () {
    await registry.connect(multisigAdmin).grantRole(issuerRole, universityA.address);
    await registry.connect(multisigAdmin).grantRole(issuerRole, universityB.address);
    await registry.connect(universityA).issueCredential(sampleHash, student.address, degreeCode);

    const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("Administrative correction"));

    // University B cannot revoke University A's diploma
    await expect(
      registry.connect(universityB).revokeCredential(sampleHash, reasonHash)
    ).to.be.revertedWithCustomError(registry, "UnauthorizedIssuer");

    // University A can revoke its own diploma
    await expect(registry.connect(universityA).revokeCredential(sampleHash, reasonHash))
      .to.emit(registry, "CredentialRevoked");

    const [isValid, isRevoked] = await registry.verifyCredential(sampleHash);
    expect(isValid).to.be.false;
    expect(isRevoked).to.be.true;
  });

  it("8. Halts issuance during emergency pause while keeping read verification active", async function () {
    await registry.connect(multisigAdmin).grantRole(issuerRole, universityA.address);
    await registry.connect(universityA).issueCredential(sampleHash, student.address, degreeCode);

    await registry.connect(multisigAdmin).pause();

    const secondHash = ethers.keccak256(ethers.toUtf8Bytes("Diploma_Test_Student_002"));
    await expect(
      registry.connect(universityA).issueCredential(secondHash, student.address, degreeCode)
    ).to.be.revertedWithCustomError(registry, "EnforcedPause");

    const [isValid] = await registry.verifyCredential(sampleHash);
    expect(isValid).to.be.true;
  });
});
