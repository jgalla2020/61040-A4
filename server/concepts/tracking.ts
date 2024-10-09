import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export type GoalStatus = "complete" | "pending" | "past due";

export interface GoalDoc extends BaseDoc {
  author: ObjectId;
  name: string;
  description: string;
  status: GoalStatus;
  due: Date;
}

/**
 * concept: Tracking
 */
export default class TrackingConcept {
  public readonly goals: DocCollection<GoalDoc>;

  /**
   * Make an instance of TrackingConcept.
   */
  constructor(collectionName: string) {
    this.goals = new DocCollection<GoalDoc>(collectionName);
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
