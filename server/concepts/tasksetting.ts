import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

const STATUS_TYPES = ["complete", "in-progress"];

export type TaskStatus = (typeof STATUS_TYPES)[number];

export interface TaskDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
}

/**
 * concept: TaskSetting [Author]
 */
export default class TaskingConcept {
  public readonly tasks: DocCollection<TaskDoc>;

  /**
   * Make an instance of Tasksetting.
   *
   * @param collectionName the name of this collection of tasks.
   */
  constructor(collectionName: string) {
    this.tasks = new DocCollection<TaskDoc>(collectionName);
  }

  /**
   * Create a task with a title and description.
   *
   * @param author the author of this task.
   * @param title the task's title.
   * @param description the task's description.
   * @returns an object containing a success message and the task details.
   */
  async create(author: ObjectId, title: string, description: string) {
    await this.assertValidTaskDetails(title, description);
    const _id = await this.tasks.createOne({ author, title, description, status: "in-progress" });
    return { msg: "Task created successfully!", task: await this.tasks.readOne({ _id }) };
  }

  /**
   * Get all of the tasks created.
   *
   * @returns all of the tasks created.
   */
  async getTasks() {
    return await this.tasks.readMany({}, { sort: { _id: -1 } });
  }

  /**
   * Get the tasks created by some author.
   *
   * @param author the ObjectId used to query the task.
   * @returns the tasks created by this author.
   */
  async getByAuthor(author: ObjectId) {
    return await this.tasks.readMany({ author });
  }

  /**
   * Update a task with new details.
   *
   * @param _id the ID identifying the task to update (required).
   * @param title the updated task title (optional).
   * @param description the updated task description (optional).
   * @param status the updated task status (optional).
   * @returns an object containing a success message and the updated task details.
   */
  async update(_id: ObjectId, title?: string, description?: string, status?: TaskStatus) {
    await this.tasks.partialUpdateOne({ _id }, { title, description, status });
    return { msg: "Task updated successfully!", task: await this.tasks.readOne({ _id }) };
  }

  /**
   * Deletes a task.
   *
   * @param _id the ID identifying the task to delete.
   * @returns an object containing the task deletion success message.
   */
  async delete(_id: ObjectId) {
    await this.tasks.deleteOne({ _id });
    return { msg: "Task deleted successfully!" };
  }

  /**
   * Checks if some task belongs to a user.
   *
   * @param _id the ID identifying the task.
   * @param user the ID for the user.
   */
  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const task = await this.tasks.readOne({ _id });
    if (!task) {
      throw new NotFoundError(`Task ${_id} does not exist!`);
    }
    if (task.author.toString() !== user.toString()) {
      throw new TaskAuthorNotMatchError(user, _id);
    }
  }

  /**
   * Checks if a status is string is a valid task status.
   *
   * @param status a string input.
   */
  async assertValidStatus(status: string | undefined) {
    if (status && !STATUS_TYPES.includes(status)) {
      throw new InvalidStatusError(status);
    }
  }

  /**
   * Checks if the task title and description are invalid.
   *
   * @param title the task's title.
   * @param description the task's description.
   */
  private async assertValidTaskDetails(title: string, description: string) {
    if (!title || !description) {
      throw new BadValuesError("Title and description must be non-empty!");
    }
  }
}

/**
 * Error thrown when an action is attempted on a task by a user who is not the author.
 */
export class TaskAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${author} is not the author of task ${_id}!`);
  }
}

/**
 * Error thrown when a status string is not a valid task status.
 */
export class InvalidStatusError extends NotAllowedError {
  constructor(public readonly status: string) {
    super(`${status} is not a valid task status.`);
  }
}
