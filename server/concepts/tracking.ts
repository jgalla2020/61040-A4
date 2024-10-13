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
   *
   * @param collectionName the name of this collection of goals.
   */
  constructor(collectionName: string) {
    this.goals = new DocCollection<GoalDoc>(collectionName);
  }

  /**
   * Create a goal with a title, description, and due date.
   *
   * @param executor the person working towards this goal.
   * @param title the title of the goal.
   * @param due the goal's expected completion date.
   * @param description the goal's description.
   * @returns an object containing a success message and the goal details.
   */
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

  /**
   * Get all of the goals created by some executor.
   *
   * @param executor the person with the goals.
   * @returns an object containing a success message and all of the executor's goals.
   */
  async viewGoals(executor: ObjectId) {
    const goals = await this.goals.readMany({ executor });

    return { msg: `Successfully obtained all goals for executor ${executor}.`, goals: goals };
  }

  /**
   * View goals with a particular status.
   *
   * @param executor the person with the goals.
   * @param status the status of the goals.
   * @returns an object containing a success message and the goals with the status.
   */
  async viewStatus(executor: ObjectId, status: GoalStatus) {
    const goals = await this.goals.readMany({ executor, status });

    return { msg: `Succesfully obtained goals with status ${status}.`, goals: goals };
  }

  /**
   * Get a goal.
   *
   * @param _id the ID used to query the goal.
   * @returns the goal identified by the ID.
   */
  async viewOneGoal(_id: ObjectId) {
    return await this.goals.readOne({ _id });
  }

  /**
   * Update a goal with new details.
   *
   * @param _id the ID used to query the goal.
   * @param title the updated goal title (optional).
   * @param description the updated goal description (optional).
   * @param status the updated goal status (optional).
   * @param due the updated goal due date (optional).
   * @returns an object containing a success message and the updated goal details.
   */
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

  /**
   * Deletes a goal.
   * @param _id the ID used to query the goal.
   * @returns an object containing the goal deletion success message.
   */
  async delete(_id: ObjectId) {
    await this.goals.deleteOne({ _id });
    return { msg: "Goal deleted successfully!" };
  }

  /**
   * Checks if some goal belongs to a user.
   *
   * @param _id the ID used to query the goal.
   * @param user the ID for the user.
   */
  async assertExecutorIsUser(_id: ObjectId, user: ObjectId) {
    const goal = await this.goals.readOne({ _id });

    if (!goal) {
      throw new NotFoundError(`Goal ${_id} does not exist!`);
    }
    if (goal.executor.toString() !== user.toString()) {
      throw new GoalExecutorNotMatchError(user, _id);
    }
  }

  /**
   * Update the status of goals based on the current date and their due dates.
   *
   * @returns an object containing a success message for the goals being updated.
   */
  async updateGoalStatuses() {
    const currentDate = new Date();

    const pendingGoals = await this.goals.readMany({ status: "pending" });

    for (const goal of pendingGoals) {
      if (goal.due < currentDate) {
        await this.goals.partialUpdateOne({ _id: goal._id }, { status: "past due" });
      }
    }

    return { msg: "The goal statuses have been updated based on the current date." };
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
