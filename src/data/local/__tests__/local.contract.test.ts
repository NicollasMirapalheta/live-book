import { openDB } from "idb";
import { runAdapterContract, runUploadContract } from "../../__tests__/adapter.contract";
import { LocalAdapter } from "../LocalAdapter";
import type { AssetSize } from "../../../book/schema";

// T6: o contrato unico do StorageAdapter fica verde pela primeira vez, rodando
// contra o LocalAdapter (IndexedDB via fake-indexeddb). Cada `make` abre um banco
// isolado, para os casos nao contaminarem uns aos outros.
runAdapterContract("local", async () => new LocalAdapter(`test-${crypto.randomUUID()}`));

// T6: contrato de upload (AD-028). A sonda `assetStored` abre o MESMO banco e le a
// store de assets, tornando a coleta de orfaos de `gcAssets` observavel.
runUploadContract("local", async () => {
  const dbName = `up-${crypto.randomUUID()}`;
  const adapter = new LocalAdapter(dbName);
  const assetStored = async (assetId: string, size: AssetSize): Promise<boolean> => {
    const db = await openDB(dbName, 2);
    const record = await db.get("assets", `${assetId}/${size}`);
    db.close();
    return record != null;
  };
  return { adapter, assetStored };
});
