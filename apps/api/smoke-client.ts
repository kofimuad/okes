// Exercises the real @okes/core API client against a running API.
import { createApiClient } from "@okes/core";

async function main() {
  const api = createApiClient(process.env.API_URL ?? "http://127.0.0.1:8080");
  const email = `client+${Date.now()}@okes.app`;
  await api.register(email, "supersecret1", "Client Test");
  const me = await api.me();
  const sum = await api.summary();
  const wallets = await api.listWallets();
  const tx = await api.listTransactions({ limit: 5 });
  console.log(
    JSON.stringify({
      me: me.user.email,
      balanceMinor: sum.balanceMinor,
      walletCount: sum.walletCount,
      wallets: wallets.wallets.length,
      transactions: tx.transactions.length,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
