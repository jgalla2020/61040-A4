import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface MessageDoc extends BaseDoc {
  from: ObjectId;
  to: ObjectId;
  message: string;

  draft?: boolean;
  timeDrafted?: Date;

  sent?: boolean;
  timeSent?: Date;

  received?: boolean;
  timeReceived?: Date;
}

/**
 * concept: Messaging [Contact]
 */
export default class MessagingConcept {
  public readonly messages: DocCollection<MessageDoc>;

  /**
   * Make an instance of MessagingConcept.
   *
   * @param collectionName the name of this collection of messages.
   */
  constructor(collectionName: string) {
    this.messages = new DocCollection<MessageDoc>(collectionName);
  }

  /**
   * Draft a message for one of the sender's contacts.
   *
   * @param from the message sender.
   * @param to the intended message recipient.
   * @param message the message text.
   * @returns an object containing a success message and the message draft.
   */
  async draft(from: ObjectId, to: ObjectId, message: string) {
    const time: Date = new Date();
    const _id = await this.messages.createOne({ from: from, to: to, timeDrafted: time, message, draft: true });

    return { msg: "Message draft created successfully!", draft: await this.messages.readOne({ _id }) };
  }

  /**
   * Read all of the drafts created by some sender.
   *
   * @param from the message sender.
   * @returns the drafted messages.
   */
  async readDrafts(from: ObjectId) {
    return await this.messages.readMany({ from: from, draft: true });
  }

  /**
   * Edit a message draft. Only the message text and contact can be edited.
   * Throws an error if the message does not exist or has already been sent.
   *
   * @param _id the ID used to query the message object.
   * @param message the message text.
   * @param to the recipient ID.
   * @returns an object with a success message and the edited message draft.
   */
  async editDraft(_id: ObjectId, message?: string, to?: ObjectId) {
    const messageObj = await this.messages.readOne({ _id });

    if (!messageObj) {
      throw new NotFoundError(`Message ${_id} does not exist.`);
    }

    if (messageObj.sent) {
      throw new NotADraftError(_id);
    }

    const updatedMessage = message !== undefined ? message : messageObj.message;
    const updatedContact = to !== undefined ? to : messageObj.to;

    await this.messages.partialUpdateOne({ _id }, { message: updatedMessage, to: updatedContact });

    return { msg: "Message updated successfully!", editedDraft: await this.messages.readOne({ _id }) };
  }

  /**
   * Checks if some editor is the message sender. Throws an error if the
   * editor is not the sender of the message.
   *
   * @param _id the ID used to query the message object.
   * @param editor the message editor.
   */
  async assertEditorIsSender(_id: ObjectId, editor: ObjectId) {
    const message = await this.messages.readOne({ _id });

    if (!message) {
      throw new NotFoundError("This message does not exist.");
    }

    if (message.from.toString() !== editor.toString()) {
      throw new EditorNotMatchError(editor, _id);
    }
  }

  /**
   * Send a message to a recipient. Throws an error if the message is not a draft
   * or the sender/recipient information is incorrect.
   *
   * @param _id the ID used to query the message object.
   * @param from the intended message sender.
   * @param to the intended message recipient.
   * @returns an object containing a success message and the sent message.
   */
  async send(_id: ObjectId, from: ObjectId, to: ObjectId) {
    const messageObj = await this.messages.readOne({ _id });

    // Check if the message exists
    if (!messageObj) {
      throw new NotFoundError(`Message ${_id} does not exist.`);
    }

    const messageFrom = messageObj.from;
    const messageTo = messageObj.to;

    // Check if the message was created by the sender
    if (messageFrom.toString() !== from.toString()) {
      throw new NotAllowedError(`This message was not drafted by sender ${from}.`);
    }

    // Check if the message is addressed to the recipient
    if (messageTo.toString() !== to.toString()) {
      throw new NotAllowedError(`This message is not addressed to contact ${to}.`);
    }

    // Check if the message is a draft
    if (messageObj.draft !== undefined && !messageObj.draft) {
      throw new NotADraftError(_id);
    }

    // If so, update and create the message where appropriate
    const currentTime = new Date();

    await this.messages.partialUpdateOne({ _id }, { sent: true, timeSent: currentTime, draft: undefined, timeDrafted: undefined });
    await this.messages.createOne({ from: from, to: to, message: messageObj.message, received: true, timeReceived: currentTime });

    return { msg: "Message sent successfully!", sentMessage: this.messages.readOne({ _id }) };
  }

  /**
   * Read the sent messages.
   *
   * @param from the message sender.
   * @param to the message recipient.
   * @returns the messages sent by the sender.
   */
  async readSent(from: ObjectId, to: ObjectId) {
    return await this.messages.readMany({ from: from, to: to, sent: true });
  }

  /**
   * Read the received messages.
   *
   * @param from the message sender.
   * @param to the message recipient.
   * @returns the messages received by the sender.
   */
  async readReceived(from: ObjectId, to: ObjectId) {
    return await this.messages.readMany({ from: from, to: to, received: true });
  }

  /**
   * Read a specific message.
   *
   * @param _id the ID used to query the message.
   * @returns the message object corresponding to the ID.
   */
  async read(_id: ObjectId) {
    return await this.messages.readOne({ _id });
  }

  /**
   * Delete a specific message.
   *
   * @param _id the ID used to query the message.
   * @returns
   */
  async delete(_id: ObjectId) {
    await this.messages.deleteOne({ _id });
    return { msg: "Message deleted successfully!" };
  }
}

/**
 * Error thrown when an action is attempted on a message by an editor who is not the sender.
 */
export class EditorNotMatchError extends NotAllowedError {
  constructor(
    public readonly editor: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${editor} is not the sender of message ${_id}!`);
  }
}

/**
 * Error thrown when attempting to edit a sent message.
 */
export class NotADraftError extends NotAllowedError {
  constructor(public readonly _id: ObjectId) {
    super(`$The message ${_id} cannot be edited because it is not a draft!`);
  }
}
