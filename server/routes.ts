import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Friending, Itemizing, Messaging, Posting, Profiling, Sessioning, Tracking } from "./app";
import { ItemStatus } from "./concepts/itemizing";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import { GoalStatus } from "./concepts/tracking";
import Responses from "./responses";

import { z } from "zod";
import { NotAllowedError, NotFoundError } from "./concepts/errors";
import { NotADraftError } from "./concepts/messaging";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  // Routes for creating, deleting, and updating user tasks

  @Router.get("/tasks")
  @Router.validate(z.object({ worker: z.string().optional() }))
  async getTasks(worker?: string) {
    let tasks;

    if (worker) {
      const id = (await Authing.getUserByUsername(worker))._id;
      tasks = await Itemizing.getByCreator(id);
    } else {
      tasks = await Itemizing.getItems();
    }

    return tasks;
  }

  @Router.post("/tasks")
  async createTask(session: SessionDoc, title: string, description: string) {
    const user = Sessioning.getUser(session);

    await Itemizing.assertValidItemDetails(title, description);

    return await Itemizing.create(user, title, description, "in-progress");
  }

  @Router.patch("/tasks/:id")
  async updateTask(session: SessionDoc, id: string, title?: string, description?: string, status?: ItemStatus) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Itemizing.assertCreatorIsUser(oid, user);

    await Itemizing.assertValidStatus(status);

    return await Itemizing.update(oid, title, description, status);
  }

  @Router.delete("/tasks/:id")
  async deleteTask(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Itemizing.assertCreatorIsUser(oid, user);
    return await Itemizing.delete(oid);
  }

  // Routes for creating, deleting, and updating user profiles

  @Router.get("/profile")
  async getProfile(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    await Profiling.assertProfileExists(user);

    return await Profiling.viewProfile(user);
  }

  @Router.post("/profile")
  async createProfile(session: SessionDoc, name: string, contact?: string, bio?: string) {
    const user = Sessioning.getUser(session);
    await Profiling.assertProfileDoesNotExist(user);

    return await Profiling.create(user, name, contact, bio);
  }

  @Router.delete("/profile")
  async deleteProfile(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    await Profiling.assertProfileExists(user);

    return await Profiling.delete(user);
  }

  @Router.patch("/profile")
  async updateProfile(session: SessionDoc, name?: string, contact?: string, bio?: string) {
    const user = Sessioning.getUser(session);
    await Profiling.assertProfileExists(user);

    return await Profiling.update(user, name, contact, bio);
  }

  // Routes for creating, deleting, and updating user goals

  @Router.post("/goals")
  async createGoal(session: SessionDoc, title: string, due: string, description?: string) {
    const executor = Sessioning.getUser(session);

    const parsedDueDate: Date = new Date(due);

    return await Tracking.create(executor, title, parsedDueDate, description);
  }

  @Router.get("/goals/pending")
  async getPending(session: SessionDoc) {
    const executor = Sessioning.getUser(session);
    return await Tracking.viewStatus(executor, "pending");
  }

  @Router.get("/goals/complete")
  async getComplete(session: SessionDoc) {
    const executor = Sessioning.getUser(session);
    return await Tracking.viewStatus(executor, "complete");
  }

  @Router.get("/goals/pastdue")
  async getPastDue(session: SessionDoc) {
    const executor = Sessioning.getUser(session);
    return await Tracking.viewStatus(executor, "past due");
  }

  @Router.patch("/goals/:id")
  async updateGoal(session: SessionDoc, id: string, title?: string, description?: string, status?: GoalStatus, due?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);

    await Tracking.assertExecutorIsUser(oid, user);

    let parsedDueDate;

    if (due) {
      parsedDueDate = new Date(due);
    } else {
      parsedDueDate = (await Tracking.viewOneGoal(oid))?.due;
    }

    return await Tracking.edit(oid, title, description, status, parsedDueDate);
  }

  // Routes for creating, editing, sending, and unsending messages

  @Router.post("/messages")
  async writeMessage(session: SessionDoc, contactUser: string, message: string) {
    const sender = Sessioning.getUser(session);
    const contactID = (await Authing.getUserByUsername(contactUser))._id;

    return await Messaging.draft(sender, contactID, message);
  }

  @Router.get("/messages/drafts")
  async readDrafts(session: SessionDoc) {
    const sender = Sessioning.getUser(session);

    return await Messaging.readDrafts(sender);
  }

  @Router.get("/messages/sent")
  async readSent(session: SessionDoc, contactUser: string) {
    const sender = Sessioning.getUser(session);
    const contactID = (await Authing.getUserByUsername(contactUser))._id;

    return await Messaging.readSent(sender, contactID);
  }

  @Router.get("/messages/received")
  async readReceived(session: SessionDoc, contactUser: string) {
    const receiver = Sessioning.getUser(session);
    const contactID = (await Authing.getUserByUsername(contactUser))._id;

    return await Messaging.readReceived(receiver, contactID);
  }

  @Router.patch("/messages/send/:id")
  async sendMessage(session: SessionDoc, id: string) {
    const userID = Sessioning.getUser(session);
    const messageID = await new ObjectId(id);

    const messageObj = await Messaging.read(userID, messageID);

    if (!messageObj) throw new NotAllowedError(`Message with id ${id} does not exist.`);

    await Messaging.assertUserIsSender(userID, messageID);

    if (!messageObj.draft) throw new NotADraftError(messageID);

    return await Messaging.send(messageID, userID, messageObj.to);
  }

  @Router.patch("/messages")
  async editMessage(session: SessionDoc, id: string, contact?: string, message?: string) {
    const userID = Sessioning.getUser(session);
    const messageID = new ObjectId(id);

    const messageObj = await Messaging.read(userID, messageID);

    if (!messageObj) {
      throw new NotFoundError(`Message with ID ${id} does not exist.`);
    }

    await Messaging.assertUserIsSender(userID, messageID);

    const isSent = messageObj.sent;

    if (isSent && contact) {
      throw new NotAllowedError(`Cannot edit the contact of a sent message.`);
    } else if (isSent) {
      return await Messaging.editSent(messageID, message);
    } else {
      const contactID = new ObjectId(contact);
      return await Messaging.editDraft(messageID, message, contactID);
    }
  }

  @Router.delete("/messages")
  async deleteMessage(session: SessionDoc, id: string) {
    const userID = Sessioning.getUser(session);
    const messageID = new ObjectId(id);

    await Messaging.assertSenderOrReceiver(userID, messageID);

    const messageObj = await Messaging.read(userID, messageID);

    if (!messageObj) {
      throw new NotFoundError(`Message with ID ${id} does not exist.`);
    }

    await Messaging.assertUserIsSender(userID, messageID);

    const isSent = messageObj.sent;

    if (isSent) {
      return await Messaging.deleteSent(userID, messageID);
    } else {
      return await Messaging.deleteDraft(userID, messageID);
    }
  }

  // Routes for creating, editing, and deleting preferences
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
