import type { Firestore, Transaction, WriteBatch, WriteResult } from "./types";

export class Context {
  public firestore: Firestore;
  private _transaction?: Transaction = undefined;
  private _batch?: WriteBatch = undefined;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  get transaction(): Transaction | undefined {
    return this._transaction;
  }

  get batch(): WriteBatch | undefined {
    return this._batch;
  }

  public async runTransaction(updateFunction: (transaction: Transaction) => Promise<void>): Promise<void> {
    if (this._transaction || this._batch) {
      throw new Error(`Disallow nesting transaction or batch`);
    }

    try {
      await this.firestore.runTransaction(async (tx) => {
        this._transaction = tx;
        await updateFunction(tx);
      });
      this._transaction = undefined;
    } catch (err) {
      this._transaction = undefined;
      throw err;
    }
  }

  public async runBatch(updateFunction: (batch: WriteBatch) => Promise<void>): Promise<WriteResult[]> {
    if (this._transaction || this._batch) {
      throw new Error(`Disallow nesting transaction or batch`);
    }

    this._batch = this.firestore.batch();

    try {
      await updateFunction(this._batch);
      const writeResults = await this._batch.commit();
      this._batch = undefined;
      return writeResults;
    } catch (err) {
      this._batch = undefined;
      throw err;
    }
  }
}
