function sanitizeUser(user) {
  if (!user) return null;

  const safe =
    typeof user.toObject === "function"
      ? user.toObject()
      : JSON.parse(JSON.stringify(user));

  // ----------------------------
  // 🔐 AUTH / SENSITIVE FIELDS
  // ----------------------------
  delete safe.password;
  delete safe.telegramToken;
  delete safe.walletToken;
  delete safe.googleId;
  delete safe.twitterId;

  // ----------------------------
  // 🧠 MONGOOSE INTERNALS
  // ----------------------------
  delete safe.__v;

  // timestamps (optional — keep if you want frontend sorting)
  delete safe.createdAt;
  delete safe.updatedAt;

  // ----------------------------
  // 💳 WALLET SECURITY
  // ----------------------------
  if (safe.wallet) {
    delete safe.wallet.privateKey;
    delete safe.wallet.seed;
  }

  // ----------------------------
  // 📊 USAGE / BILLING (optional privacy layer)
  // ----------------------------
  if (safe.usage) {
    // keep usage if you want dashboard
    // otherwise uncomment below to hide:
    // delete safe.usage;
  }

  // ----------------------------
  // 🪪 NFT INFO (keep public, remove sensitive IDs if needed)
  // ----------------------------
  if (safe.nft) {
    delete safe.nft.transactionHash; // optional privacy
    delete safe.nft.img_Id; // internal storage ID
  }

  // ----------------------------
  // 🔗 POPULATED REFS CLEANUP
  // ----------------------------
  // remove if populated accidentally with heavy data
  if (safe.plan && typeof safe.plan === "object") {
    // keep or strip depending on need
    // delete safe.plan;
  }

  // ----------------------------
  // 🧹 EXTRA SAFETY CLEANUP
  // ----------------------------
  delete safe.lastSwept;
  delete safe.lastBalanceUpdate;
  delete safe.lastLogin;

  return safe;
}

module.exports = sanitizeUser;