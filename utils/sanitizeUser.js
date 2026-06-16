function sanitizeUser(user, includeTelegramToken = false) {
  if (!user) return null;

  const safe =
    typeof user.toObject === "function"
      ? user.toObject()
      : JSON.parse(JSON.stringify(user));

  // ----------------------------
  // 🔐 AUTH / SENSITIVE FIELDS
  // ----------------------------
  delete safe.password;
  delete safe.walletToken;
  delete safe.googleId;
  delete safe.twitterId;

  // ONLY delete if NOT explicitly requested
  if (!includeTelegramToken) {
    delete safe.telegramToken;
  }

  // ----------------------------
  // 🧠 MONGOOSE INTERNALS
  // ----------------------------
  delete safe.__v;

  // timestamps (optional)
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
  // 🪪 NFT INFO
  // ----------------------------
  if (safe.nft) {
    delete safe.nft.transactionHash;
    delete safe.nft.img_Id;
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