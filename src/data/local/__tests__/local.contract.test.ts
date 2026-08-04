import { runAdapterContract } from "../../__tests__/adapter.contract";
import { LocalAdapter } from "../LocalAdapter";

// T6: o contrato unico do StorageAdapter fica verde pela primeira vez, rodando
// contra o LocalAdapter (IndexedDB via fake-indexeddb). Cada `make` abre um banco
// isolado, para os casos nao contaminarem uns aos outros.
runAdapterContract("local", async () => new LocalAdapter(`test-${crypto.randomUUID()}`));
