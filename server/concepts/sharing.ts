import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export type ItemType = "document" | "task list";

export interface ItemDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  content: string;
  type: ItemType;
}

export interface AddressDoc extends BaseDoc {
  recipient: ObjectId;
  address: string;
}

export interface ShareDoc extends BaseDoc {
  sender: ObjectId;
  recipient: ObjectId;
  item: ItemDoc;
}

/**
 * concept: Sharing
 */
export default class SharingConcept {
  public readonly items: DocCollection<ItemDoc>;
  public readonly addresses: DocCollection<AddressDoc>;
  public readonly shared: DocCollection<ShareDoc>;

  /**
   * Make an instance of SharingConcept.
   */
  constructor(collectionName: string) {
    this.items = new DocCollection<ItemDoc>(collectionName + "_items");
    this.addresses = new DocCollection<AddressDoc>(collectionName + "_addresses");
    this.shared = new DocCollection<ShareDoc>(collectionName + "_shared");
  }

  async create() {
    //
  }

  async view() {
    //
  }

  async delete() {
    //
  }

  async edit() {
    //
  }
}
