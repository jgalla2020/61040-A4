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
   *
   * @param collectionName the name of this collection of profiles.
   */
  constructor(collectionName: string) {
    this.profiles = new DocCollection<ProfileDoc>(collectionName);
  }

  /**
   * Create a profile with a user's name, contact, and bio.
   *
   * @param user the user this profile belongs to.
   * @param name the name of the user.
   * @param contact the user's contact.
   * @param bio a description of the user.
   * @returns an object containing a success message and the profile details.
   */
  async create(user: ObjectId, name: string, contact?: string, bio?: string) {
    await this.profiles.createOne({ user, name, contact, bio });

    return { msg: "Profile created successfully!", profile: await this.profiles.readOne({ user }) };
  }

  /**
   * Get the profile belonging to some user.
   *
   * @param user the user viewing the profile.
   * @returns the profile created by this user.
   */
  async viewProfile(user: ObjectId) {
    return await this.profiles.readOne({ user });
  }

  /**
   * Update a user's profile details.
   *
   * @param user the user updating the profile (required).
   * @param name the updated name (optional).
   * @param contact the updated contact information (optional).
   * @param bio the updated bio (optional).
   * @returns an object containing a success message and the updated profile details.
   */
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

  /**
   *
   * @param user the user deleting the profile.
   * @returns an object containing the profile deletion success message.
   */
  async delete(user: ObjectId) {
    await this.profiles.deleteOne({ user });

    return { msg: "Profile deleted successfully!" };
  }

  /**
   * Checks if some user's profile exists.
   *
   * @param user the profile's user.
   */
  async assertProfileExists(user: ObjectId) {
    const profile = await this.profiles.readOne({ user });

    if (!profile) {
      throw new ProfileDoesNotExistsError(user);
    }
  }

  /**
   * Checks if some user's profile does not exist.
   *
   * @param user the profile's user.
   */
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
