import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export interface ProfileDoc extends BaseDoc {
  author: ObjectId;
  name: string;
  contact?: string;
  bio?: string;
}

/**
 * concept: Profiling
 */
export default class ProfilingConcept {
  public readonly profiles: DocCollection<ProfileDoc>;

  /**
   * Make an instance of ProfilingConcept.
   */
  constructor(collectionName: string) {
    this.profiles = new DocCollection<ProfileDoc>(collectionName);
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
