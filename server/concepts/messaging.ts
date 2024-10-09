import { ObjectId, Timestamp } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface MessageDoc extends BaseDoc {
  sender: ObjectId;
  recipient: ObjectId;
  time: Timestamp;
  message: string;
}

/**
 * concept: Messaging
 */
export default class MessagingConcept {
  public readonly drafts: DocCollection<MessageDoc>;
  public readonly sent: DocCollection<MessageDoc>;

  /**
   * Make an instance of MessagingConcept.
   */
  constructor(collectionName: string) {
    this.drafts = new DocCollection<MessageDoc>(collectionName + "_drafted");
    this.sent = new DocCollection<MessageDoc>(collectionName + "_sent");
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

  async send() {
    //
  }
}
