import { strict as assert } from "assert";
import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

const STATUS_TYPES = ["complete", "in-progress"];

export type ItemStatus = (typeof STATUS_TYPES)[number];

export interface ItemDoc extends BaseDoc {
  creator: ObjectId;
  title: string;
  description: string;
  status?: ItemStatus;
}

/**
 * concept: Itemize [Creator]
 */
export default class ItemizingConcept {
  public readonly items: DocCollection<ItemDoc>;

  /**
   * Make an instance of itemsettingConcept.
   *
   * @param collectionName the name of this collection of items.
   */
  constructor(collectionName: string) {
    this.items = new DocCollection<ItemDoc>(collectionName);
  }

  /**
   * Create an item with a title and description.
   *
   * @param creator the creator of this item.
   * @param title the item's title.
   * @param description the item's description.
   * @returns an object containing a success message and the item details.
   */
  async create(creator: ObjectId, title: string, description: string, status?: ItemStatus) {
    const _id = await this.items.createOne({ creator, title, description, status });
    return { msg: "item created successfully!", item: await this.items.readOne({ _id }) };
  }

  /**
   * Get all of the items created.
   *
   * @returns all of the items created.
   */
  async getItems() {
    return await this.items.readMany({}, { sort: { _id: -1 } });
  }

  /**
   * Get the items created by some creator.
   *
   * @param creator the ObjectId used to query the item.
   * @returns the items created by this creator.
   */
  async getByCreator(creator: ObjectId) {
    return await this.items.readMany({ creator: creator });
  }

  /**
   * Update an item with new details.
   *
   * @param _id the ID identifying the item to update (required).
   * @param title the updated item title (optional).
   * @param description the updated item description (optional).
   * @param status the updated item status (optional).
   * @returns an object containing a success message and the updated item details.
   */
  async update(_id: ObjectId, title?: string, description?: string, status?: ItemStatus) {
    const item = await this.items.readOne({ _id });

    assert(item, `item ${_id} does not exist!`);

    // For fields not provided, keep existing fields.
    const updateFields: Partial<{ title: string; description: string; status: ItemStatus }> = {
      title: title,
      description: description,
      status: status,
    };

    if (updateFields.title === undefined) updateFields.title = item.title;
    if (updateFields.description === undefined) updateFields.description = item.description;
    if (updateFields.status === undefined) updateFields.status = item.status;

    await this.items.partialUpdateOne({ _id }, updateFields);
    return { msg: "item updated successfully!", item: await this.items.readOne({ _id }) };
  }

  /**
   * Deletes an item.
   *
   * @param _id the ID identifying the item to delete.
   * @returns an object containing the item deletion success message.
   */
  async delete(_id: ObjectId) {
    await this.items.deleteOne({ _id });
    return { msg: "item deleted successfully!" };
  }

  /**
   * Checks if some item belongs to a user.
   *
   * @param _id the ID identifying the item.
   * @param user the ID for the user.
   */
  async assertCreatorIsUser(_id: ObjectId, user: ObjectId) {
    const item = await this.items.readOne({ _id });
    if (!item) {
      throw new NotFoundError(`item ${_id} does not exist!`);
    }
    if (item.creator.toString() !== user.toString()) {
      throw new ItemCreatorNotMatchError(user, _id);
    }
  }

  /**
   * Checks if a status is string is a valid item status.
   *
   * @param status a string input.
   */
  async assertValidStatus(status: string | undefined) {
    if (status && !STATUS_TYPES.includes(status)) {
      throw new InvalidStatusError(status);
    }
  }

  /**
   * Checks if the item title and description are invalid.
   *
   * @param title the item's title.
   * @param description the item's description.
   */
  async assertValidItemDetails(title: string, description: string) {
    if (!title || !description) {
      throw new BadValuesError("Title and description must be non-empty!");
    }
  }
}

/**
 * Error thrown when an action is attempted on an item by a user who is not the creator.
 */
export class ItemCreatorNotMatchError extends NotAllowedError {
  constructor(
    public readonly creator: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${creator} is not the creator of item ${_id}!`);
  }
}

/**
 * Error thrown when a status string is not a valid item status.
 */
export class InvalidStatusError extends NotAllowedError {
  constructor(public readonly status: string) {
    super(`${status} is not a valid item status.`);
  }
}
