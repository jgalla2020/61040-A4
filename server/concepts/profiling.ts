import { strict as assert } from "assert";
import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface ProfileDoc extends BaseDoc {
  user: ObjectId;
  name: string;
  contact?: string;
  bio?: string;
}

/**
 * concept: Profiling [User]
 */
export default class ProfilingConcept {
  public readonly profiles: DocCollection<ProfileDoc>;

  /**
   * Make an instance of ProfilingConcept.
   */
  constructor(collectionName: string) {
    this.profiles = new DocCollection<ProfileDoc>(collectionName);
  }

  async create(user: ObjectId, name: string, contact?: string, bio?: string) {
    await this.profiles.createOne({ user, name, contact, bio });

    return { msg: "Profile created successfully!", profile: await this.profiles.readOne({ user }) };
  }

  async viewProfile(user: ObjectId) {
    return await this.profiles.readOne({ user });
  }

  async delete(user: ObjectId) {
    await this.profiles.deleteOne({ user });

    return { msg: "Profile deleted successfully!" };
  }

  async update(user: ObjectId, name?: string, contact?: string, bio?: string) {
    const userProfile = await this.viewProfile(user);

    assert(userProfile, `User ${user} does not have a profile.`);

    const updateFields: Partial<{ name: string; contact: string; bio: string }> = {
      name: name,
      contact: contact,
      bio: bio,
    };

    if (updateFields.name === undefined) updateFields.name = userProfile.name;
    if (updateFields.contact === undefined) updateFields.contact = userProfile.contact;
    if (updateFields.bio === undefined) updateFields.bio = userProfile.bio;

    await this.profiles.partialUpdateOne({ user }, updateFields);

    return { msg: "Profile updated successfully!", profile: await this.profiles.readOne({ user }) };
  }

  async assertProfileExists(user: ObjectId) {
    const profile = await this.profiles.readOne({ user });

    if (!profile) {
      throw new ProfileDoesNotExistsError(user);
    }
  }

  async assertProfileDoesNotExist(user: ObjectId) {
    const profile = await this.profiles.readOne({ user });

    if (profile) {
      throw new UserProfileExistsError(user);
    }
  }
}

/**
 * Error thrown when a user profile already exists.
 */
export class UserProfileExistsError extends NotAllowedError {
  constructor(public readonly user: ObjectId) {
    super(`There already exists a profile for user ${user}.`);
  }
}

/**
 * Error thrown when a user profile does not exist.
 */
export class ProfileDoesNotExistsError extends NotAllowedError {
  constructor(public readonly user: ObjectId) {
    super(`There does not exist a profile for user ${user}.`);
  }
}
