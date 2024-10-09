import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export type TaskStatus = "complete" | "in-progress";

export interface TaskDoc extends BaseDoc {
  author: ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
}

/**
 * concept: TaskSetting
 */
export default class TasksettingConcept {
  public readonly tasks: DocCollection<TaskDoc>;

  /**
   * Make an instance of Tasksetting.
   */
  constructor(collectionName: string) {
    this.tasks = new DocCollection<TaskDoc>(collectionName);
  }

  async create(author: ObjectId, title: string, description: string) {
    await this.assertValidTaskDetails(title, description);
    const _id = await this.tasks.createOne({ author, title, description, status: "in-progress" });
    return { msg: "Task created successfully!", task: await this.tasks.readOne({ _id }) };
  }

  async getTasks() {
    // Return all tasks!
    return await this.tasks.readMany({}, { sort: { _id: -1 } });
  }

  async getByAuthor(author: ObjectId) {
    // Return all tasks for some author!
    return await this.tasks.readMany({ author });
  }

  async update(_id: ObjectId, title?: string, description?: string, status?: TaskStatus) {
    await this.tasks.partialUpdateOne({ _id }, { title, description, status });
    return { msg: "Task updated successfully!", task: await this.tasks.readOne({ _id }) };
  }

  async delete(_id: ObjectId) {
    await this.tasks.deleteOne({ _id });
    return { msg: "Task deleted successfully!" };
  }

  async assertAuthorIsUser(_id: ObjectId, user: ObjectId) {
    const task = await this.tasks.readOne({ _id });
    if (!task) {
      throw new NotFoundError(`Task ${_id} does not exist!`);
    }
    if (task.author.toString() !== user.toString()) {
      throw new TaskAuthorNotMatchError(user, _id);
    }
  }

  private async assertValidTaskDetails(title: string, description: string) {
    if (!title || !description) {
      throw new BadValuesError("Title and description must be non-empty!");
    }
  }
}

export class TaskAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of task {1}!", author, _id);
  }
}
