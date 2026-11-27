/**
 * Trust anchor for Pro licenses.
 * The matching private key stays on the billing server only (never in this image, never in .env).
 * A deployer cannot swap it: a fake billing server or a hand-written JSON file fails verification.
 */
export const VERITAS_BILLING_ORIGIN = "https://billing.veritas-msp.com";

export const LICENSE_LEASE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEArcTgYI4LsAuRDSWWpvqAoCodad1cyQNFDCcwfgGZ9tE=
-----END PUBLIC KEY-----
`;

export const LICENSE_LEASE_VERSION = 2;
export const LICENSE_LEASE_ALG = "ed25519";
export const LICENSE_LEASE_ISSUER = "veritas-billing";
