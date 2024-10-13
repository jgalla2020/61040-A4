import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

const GOAL_TYPES = ["complete", "pending", "past due"];

export type GoalStatus = (typeof GOAL_TYPES)[number];

export interface GoalDoc extends BaseDoc {
  executor: ObjectId;
  title: string;
  description: string;
  status: GoalStatus;
  due: Date;
}

/**
 * concept: Tracking [Executor]
 */
export default class TrackingConcept {
  public readonly goals: DocCollection<GoalDoc>;

  /**
   * Make an instance of TrackingConcept.
   */
  constructor(collectionName: string) {
    this.goals = new DocCollection<GoalDoc>(collectionName);
  }

  async create(executor: ObjectId, title: string, due: Date, description?: string) {
    const currentDate = new Date();

    let status = "pending";

    // Check if the due date has passed
    if (due < currentDate) {
      status = "past due";
    }

    const _id = await this.goals.createOne({ executor, title, description, status, due });

    return { msg: "Goal created successfully!", goal: await this.goals.readOne({ _id }) };
  }

  async getGoal(_id: ObjectId) {
    return await this.goals.readOne({ _id });
  }

  async view(executor: ObjectId, status: GoalStatus) {
    const goals = await this.goals.readMany({ executor, status });

    return { msg: `Goals with status ${status}.`, goals: goals };
  }

  async delete(_id: ObjectId) {
    await this.goals.deleteOne({ _id });
    return { msg: "Goal deleted successfully!" };
  }

  async edit(_id: ObjectId, title?: string, description?: string, status?: GoalStatus, due?: Date) {
    const goal = await this.goals.readOne({ _id });

    if (!goal) {
      throw new NotFoundError(`Goal ${_id} does not exist!`);
    }

    // For fields not provided, keep existing fields.
    const updateFields: Partial<{ title: string; description: string; status: GoalStatus; due: Date }> = {
      title: title,
      description: description,
      status: status,
      due: due,
    };

    if (updateFields.title === undefined) updateFields.title = goal.title;
    if (updateFields.description === undefined) updateFields.description = goal.description;
    if (updateFields.status === undefined) updateFields.status = goal.status;
    if (updateFields.due === undefined) updateFields.due = goal.due;

    await this.goals.partialUpdateOne({ _id }, updateFields);
    return { msg: "Task updated successfully!", goal: await this.goals.readOne({ _id }) };
  }

  async assertExecutorIsUser(_id: ObjectId, user: ObjectId) {
    const goal = await this.goals.readOne({ _id });

    if (!goal) {
      throw new NotFoundError(`Goal ${_id} does not exist!`);
    }
    if (goal.executor.toString() !== user.toString()) {
      throw new GoalExecutorNotMatchError(user, _id);
    }
  }
}

/**
 * Error thrown when an action is attempted on a goal by a user who is not the executor.
 */
export class GoalExecutorNotMatchError extends NotAllowedError {
  constructor(
    public readonly executor: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super(`${executor} is not the executor of goal ${_id}!`);
  }
}
