import { strict as assert } from "assert";
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
  receiverMessageID?: ObjectId;

  received?: boolean;
  timeReceived?: Date;
  senderMessageID?: ObjectId;
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

    if (!messageObj.draft) {
      throw new NotADraftError(_id);
    }

    const updatedMessage = message !== undefined ? message : messageObj.message;
    const updatedContact = to !== undefined ? to : messageObj.to;

    await this.messages.partialUpdateOne({ _id }, { message: updatedMessage, to: updatedContact });

    return { msg: "Message updated successfully!", editedDraft: await this.messages.readOne({ _id }) };
  }

  /**
   * Delete a message draft.
   *
   * @param user the user attempting to delete the draft.
   * @param _id the message _id.
   * @returns a message draft deletion success message.
   */
  async deleteDraft(user: ObjectId, _id: ObjectId) {
    await this.assertUserIsSender(user, _id);

    await this.messages.deleteOne({ _id });
    return { msg: "Message draft deleted successfully!" };
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

    // If so, send the message
    const currentTime = new Date();

    const receiverMessageID = await this.messages.createOne({
      from: from,
      to: to,
      message: messageObj.message,

      received: true,
      timeReceived: currentTime,
      senderMessageID: _id,
    });

    await this.messages.partialUpdateOne(
      { _id },
      {
        draft: undefined,
        timeDrafted: undefined,

        sent: true,
        timeSent: currentTime,
        receiverMessageID: receiverMessageID,
      },
    );

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
   * Edit a sent message.
   *
   * @param _id the ID used to query the message.
   * @param message the message text.
   * @returns an object with a success message and the edited message draft.
   */
  async editSent(_id: ObjectId, message?: string) {
    const messageObj = await this.messages.readOne({ _id });

    if (!messageObj) {
      throw new NotFoundError(`Message ${_id} does not exist.`);
    }

    if (!messageObj.sent) {
      throw new MessageNotSentError(_id);
    }

    // Can only update the message text
    const updatedMessage = message !== undefined ? message : messageObj.message;

    // Need to update the message on the sender's end
    await this.messages.partialUpdateOne({ _id }, { message: updatedMessage });

    // And on the recipient's end
    await this.messages.partialUpdateOne({ _id: messageObj.receiverMessageID }, { message: updatedMessage });

    return { msg: "Message updated successfully!", editedDraft: await this.messages.readOne({ _id }) };
  }

  /**
   * Delete a sent message.
   *
   * @param user the user attempting to delete the sent message.
   * @param _id the message _id.
   * @returns a sent message deletion success message.
   */
  async deleteSent(user: ObjectId, _id: ObjectId) {
    await this.assertUserIsSender(user, _id);

    const receiverMessageID = (await this.messages.readOne({ _id }))?.receiverMessageID;
    assert(receiverMessageID, "There must be a receiver message if the message was sent.");

    // Delete on the sender's end
    await this.messages.deleteOne({ _id });

    // And on the receiver's end
    await this.messages.deleteOne({ receiverMessageID });

    return { msg: "Sent message deleted successfully!" };
  }

  /**
   * Read a specific message.
   *
   * @param user the user attempting to read the message.
   * @param _id the ID used to query the message.
   * @returns the message object corresponding to the ID.
   */
  async read(user: ObjectId, _id: ObjectId) {
    this.assertSenderOrReceiver(user, _id);
    return await this.messages.readOne({ _id });
  }

  /**
   * Checks if some user is the message sender. Throws an error if the
   * user is not the sender of the message.
   *
   * @param user the message user.
   * @param _id the ID used to query the message object.
   */
  async assertUserIsSender(user: ObjectId, _id: ObjectId) {
    const message = await this.messages.readOne({ _id });

    if (!message) {
      throw new NotFoundError("This message does not exist.");
    }

    if (message.from.toString() !== user.toString()) {
      throw new UserNotSenderError(user, _id);
    }
  }

  /**
   * Checks if some user is the message sender or receiver. If not, throws an error.
   *
   * @param user the message user.
   * @param _id the ID used to query the message object.
   */
  async assertSenderOrReceiver(user: ObjectId, _id: ObjectId) {
    const message = await this.messages.readOne({ _id });

    if (!message) {
      throw new NotFoundError("This message does not exist.");
    }

    if (message.from.toString() !== user.toString() && message.to.toString() === user.toString()) {
      throw new UserNotMatchError(user, _id);
    }
  }
}

/**
 * Error thrown when an action is attempted on a message by a user who is not the sender.
 */
export class UserNotSenderError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${user} is not the sender of message ${_id}!`);
  }
}

/**
 * Error thrown when an action is attempted on a message by a user who is not a sender or receiver.
 */
export class UserNotMatchError extends NotAllowedError {
  constructor(
    public readonly user: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${user} is not the sender or receiver of message ${_id}!`);
  }
}

/**
 * Error thrown when attempting to edit a non-drafted message.
 */
export class NotADraftError extends NotAllowedError {
  constructor(public readonly _id: ObjectId) {
    super(`$The message ${_id} cannot be edited because it is not a draft!`);
  }
}

/**
 * Error thrown when attempting to edit a message not sent.
 */
export class MessageNotSentError extends NotAllowedError {
  constructor(public readonly _id: ObjectId) {
    super(`$The message ${_id} cannot be edited because it has been sent!`);
  }
}
