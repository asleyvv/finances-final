const { ethers } = require("hardhat");

async function main() {
  const [multisigAdmin, universityRegistrar, graduateWallet, hrVerifier] = await ethers.getSigners();

  console.log("=== 1. DEPLOYING CREDENTIAL REGISTRY ===");
  const Registry = await ethers.getContractFactory("CredentialRegistry");
  const registry = await Registry.deploy(multisigAdmin.address);
  await registry.waitForDeployment();
  console.log("CredentialRegistry deployed to:", await registry.getAddress());
  console.log("Admin (stands in for the 2-of-3 multisig):", multisigAdmin.address);

  console.log("\n=== 2. ONBOARDING PILOT UNIVERSITY ===");
  const ISSUER_ROLE = await registry.ISSUER_ROLE();
  await (await registry.connect(multisigAdmin).grantRole(ISSUER_ROLE, universityRegistrar.address)).wait();
  console.log("Granted ISSUER_ROLE to University Registrar:", universityRegistrar.address);

  console.log("\n=== 3. ISSUING SALTED DIPLOMA HASH ===");
  const diplomaHash = ethers.keccak256(
    ethers.toUtf8Bytes("MockDiploma|ID:2026-0042|Degree:BSc-SE|Salt:9f82a1")
  );
  await (
    await registry.connect(universityRegistrar).issueCredential(diplomaHash, graduateWallet.address, 101)
  ).wait();
  console.log("Diploma Hash Anchored On-Chain:", diplomaHash);

  console.log("\n=== 4. CORPORATE HR INSTANT VERIFICATION (GAS-FREE) ===");
  const result = await registry.connect(hrVerifier).verifyCredential(diplomaHash);
  console.log(
    "Verification Result -> Valid:", result.isValid,
    "| Revoked:", result.isRevoked,
    "| Issuer:", result.issuer
  );

  console.log("\n=== 5. TESTING CREDENTIAL REVOCATION ===");
  const reasonHash = ethers.keccak256(ethers.toUtf8Bytes("Duplicate issuance correction"));
  await (await registry.connect(universityRegistrar).revokeCredential(diplomaHash, reasonHash)).wait();
  const postRevoke = await registry.connect(hrVerifier).verifyCredential(diplomaHash);
  console.log(
    "Post-Revocation Result -> Valid:", postRevoke.isValid,
    "| Revoked:", postRevoke.isRevoked
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
