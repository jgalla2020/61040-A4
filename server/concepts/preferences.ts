import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";

export type PreferenceLevel = "required" | "high" | "medium" | "low";

export interface PreferenceDoc extends BaseDoc {
  user: ObjectId;
  title: string;
  description: string;
  level: PreferenceLevel;
}

/**
 * concept: Preferences [User]
 */
export default class PreferencesConcept {
  public readonly preferences: DocCollection<PreferenceDoc>;

  /**
   * Make an instance of PreferencesConcept.
   */
  constructor(collectionName: string) {
    this.preferences = new DocCollection<PreferenceDoc>(collectionName);
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
