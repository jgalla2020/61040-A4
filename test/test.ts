import { strict as assert } from "assert";
import dotenv from "dotenv";
import process from "process";

// Make sure we are in test mode!
process.env.TEST = "true";

// Also need to load the .env file
dotenv.config();

import type { SessionDoc } from "../server/concepts/sessioning";

// Test mode must be set before importing the routes
import { app } from "../server/routes";

import db, { client } from "../server/db";
if (db.databaseName !== "test-db") {
  throw new Error("Not connected to test database");
}

// Actual sessions are created by Express, here we use a mock session
function getEmptySession() {
  return { cookie: {} } as SessionDoc;
}

// Before each test...
beforeEach(async () => {
  // Drop the test database
  await db.dropDatabase();

  // Add some default users we can use
  await app.createUser(getEmptySession(), "alice", "alice123");
  await app.createUser(getEmptySession(), "bob", "bob123");
});

// After all tests are done...
after(async () => {
  // Close the database connection so that Node exits
  await client.close();
});

describe("Create a user and log in", () => {
  it("should create a user and log in", async () => {
    const session = getEmptySession();

    const created = await app.createUser(session, "barish", "1234");
    assert(created.user);
    await assert.rejects(app.logIn(session, "barish", "123"));
    await app.logIn(session, "barish", "1234");
    await assert.rejects(app.logIn(session, "barish", "1234"), "Should not be able to login while already logged-in");
  });

  it("duplicate username should fail", async () => {
    const session = getEmptySession();

    const created = await app.createUser(session, "barish", "1234");
    assert(created.user);
    await assert.rejects(app.createUser(session, "barish", "1234"));
  });

  it("get invalid username should fail", async () => {
    await assert.rejects(app.getUser(""), "Username should be at least 1 character long");
    await app.getUser("alice");
  });
});

/*
 * As you add more tests, remember to put them inside `describe` blocks.
 */
describe("Creating, updating and deleting tasks", () => {
  it("should create a task", async () => {
    const session = getEmptySession();

    const created = await app.createUser(session, "barish", "1234");
    assert(created.user);

    await app.logIn(session, "barish", "1234");

    const title = "Task #1";
    const description = "Finish the 10-year bucket list assigned by your life mentor";

    const task = (await app.createTask(session, title, description)).task;
    assert(task);

    // Checking that the session user is the author
    assert.deepStrictEqual(task.author, created.user._id, "The author must be the logged in user.");

    // Checking that task details are correct as created
    assert.strictEqual(task.title, title, "The task does not have the correct title.");
    assert.strictEqual(task.description, description, "The task does not have the correct description.");
    assert.strictEqual(task.status, "in-progress", "The task does not have the correct status.");
  });

  it("should delete a task", async () => {
    const session = getEmptySession();

    const created = await app.createUser(session, "gallardo", "4321");
    assert(created.user);

    await app.logIn(session, "gallardo", "4321");

    const title = "Task #2";
    const description = "Jot down important spiritual practices that I can incorporate";

    const task = await app.createTask(session, title, description);
    const taskID = task.task?._id.toString();

    assert(taskID);

    await app.deleteTask(session, taskID);

    // Check that there should be no more tasks left
    assert.deepStrictEqual(await app.getTasks(created.user.username), [], "There should be no tasks in this session.");
  });

  it.skip("should edit a task with only a new title", async () => {
    const session = getEmptySession();

    const created = await app.createUser(session, "markathon", "0418");
    assert(created.user);

    await app.logIn(session, "markathon", "0418");

    const title = "Task #3";
    const description = "Write names of people that I am thankful for.";

    const task = await app.createTask(session, title, description);
    const oid = task.task?._id.toString();
    assert(oid);

    const newTitle = "Highly important task";
    const newTask = (await app.updateTask(session, oid, newTitle)).task;
    assert(newTask);

    // Checking that task details are correct as created
    assert.deepStrictEqual(newTask.author, created.user._id, "The task author should not change.");
    assert.deepStrictEqual(newTask.title, newTitle, `The title should have changed to ${newTitle} but it is ${newTask.title}.`);
    assert.deepStrictEqual(newTask.description, description, `The description should not have changed. It now is ${newTask.description}.`);
    assert.deepStrictEqual(newTask.status, "in-progress", `The status should not have changed. It now is ${newTask.status}.`);
  });

  it("tasks should remain after logging out", async () => {
    const session = getEmptySession();

    const created1 = await app.createUser(session, "Mark", "0418");
    assert(created1.user);
    await app.logIn(session, "Mark", "0418");

    const title1 = "Task #1";
    const description1 = "Finish the 10-year bucket list assigned by your life mentor.";
    const task1 = (await app.createTask(session, title1, description1)).task;
    assert(task1);

    const title2 = "Task #2";
    const description2 = "Tell Steven that God loves him.";
    const task2 = (await app.createTask(session, title2, description2)).task;
    assert(task2);

    await app.logOut(session);

    // Check that the correct tasks are still there
    const [output1, output2] = await app.getTasks("Mark");

    // Checking Output 1
    assert.deepStrictEqual(output1.author, created1.user._id, `Incorrect author: ${output1.author}.`);
    assert.deepStrictEqual(output1.title, title1, `Incorrect title: ${output1.title}.`);
    assert.deepStrictEqual(output1.description, description1, `Incorrect description: ${output1.description}.`);
    assert.deepStrictEqual(output1.status, "in-progress", `Incorrect status: ${output1.status}.`);

    // Checking Output2
    assert.deepStrictEqual(output2.author, created1.user._id, `Incorrect author: ${output2.author}.`);
    assert.deepStrictEqual(output2.title, title2, `Incorrect title: ${output2.title}.`);
    assert.deepStrictEqual(output2.description, description2, `Incorrect description: ${output2.description}.`);
    assert.deepStrictEqual(output2.status, "in-progress", `Incorrect status: ${output2.status}.`);
  });
});
