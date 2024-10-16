type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea" | "json";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type Operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

/**
 * This list of operations is used to generate the manual testing UI.
 */
const operations: Operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update Password",
    endpoint: "/api/users/password",
    method: "PATCH",
    fields: { currentPassword: "input", newPassword: "input" },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users (empty for all)",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Get Posts (empty for all)",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Create Post",
    endpoint: "/api/posts",
    method: "POST",
    fields: { content: "input" },
  },
  {
    name: "Update Post",
    endpoint: "/api/posts/:id",
    method: "PATCH",
    fields: { id: "input", content: "input", options: { backgroundColor: "input" } },
  },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },

  // Testing Task Operations

  {
    name: "Create Task",
    endpoint: "/api/tasks",
    method: "POST",
    fields: { title: "input", description: "textarea" },
  },

  {
    name: "Get Tasks",
    endpoint: "/api/tasks",
    method: "GET",
    fields: { author: "input" },
  },

  {
    name: "Update Task",
    endpoint: "/api/tasks/:id",
    method: "PATCH",
    fields: { id: "input", title: "input", description: "textarea", status: "input" },
  },

  {
    name: "Delete Task",
    endpoint: "/api/tasks/:id",
    method: "DELETE",
    fields: { id: "input" },
  },

  // Testing Profile Routes

  {
    name: "Get Profile",
    endpoint: "/api/profile",
    method: "GET",
    fields: {},
  },

  {
    name: "Create Profile",
    endpoint: "/api/profile",
    method: "POST",
    fields: { name: "input", contact: "input", bio: "textarea" },
  },

  {
    name: "Delete Profile",
    endpoint: "/api/profile",
    method: "DELETE",
    fields: {},
  },

  {
    name: "Update Profile",
    endpoint: "/api/profile",
    method: "PATCH",
    fields: { name: "input", contact: "input", bio: "textarea" },
  },

  // Testing Tracking Routes
  {
    name: "Create Goal",
    endpoint: "/api/goals",
    method: "POST",
    fields: { title: "input", due: "input", description: "textarea" },
  },

  {
    name: "Get Pending Goals",
    endpoint: "/api/goals/pending",
    method: "GET",
    fields: {},
  },

  {
    name: "Get Complete Goals",
    endpoint: "/api/goals/complete",
    method: "GET",
    fields: {},
  },

  {
    name: "Get Past Due Goals",
    endpoint: "/api/goals/pastdue",
    method: "GET",
    fields: {},
  },

  {
    name: "Update Goal",
    endpoint: "/api/goals/:id",
    method: "PATCH",
    fields: { id: "input", title: "input", description: "textarea", status: "input", due: "input" },
  },

  // Testing Messaging Routes
  {
    name: "Write Message Draft",
    endpoint: "/api/messages",
    method: "POST",
    fields: { contactUser: "input", message: "textarea" },
  },

  {
    name: "Read Drafts",
    endpoint: "api/messages/drafts",
    method: "GET",
    fields: {},
  },

  {
    name: "Read Sent Messages",
    endpoint: "api/messages/sent",
    method: "GET",
    fields: { contactUser: "input" },
  },

  {
    name: "Read Received Messages",
    endpoint: "api/messages/received",
    method: "GET",
    fields: { contactUser: "input" },
  },

  {
    name: "Send Message",
    endpoint: "api/messages/send/:id",
    method: "PATCH",
    fields: { id: "input" },
  },

  {
    name: "Edit Message",
    endpoint: "api/messages",
    method: "PATCH",
    fields: { id: "input", contact: "input", message: "textarea" },
  },

  {
    name: "Delete Message",
    endpoint: "api/messages",
    method: "DELETE",
    fields: { id: "input" },
  },

  // Testing Sharing Routes

  // Testing Preferences Routes
];

/*
 * You should not need to edit below.
 * Please ask if you have questions about what this test code is doing!
 */

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      const htmlTag = tag === "json" ? "textarea" : tag;
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${htmlTag} name="${prefix}${name}"></${htmlTag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const op = operations.find((op) => op.endpoint === $endpoint && op.method === $method);
  const pairs = Object.entries(reqData);
  for (const [key, val] of pairs) {
    if (val === "") {
      delete reqData[key];
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const type = key.split(".").reduce((obj, key) => obj[key], op?.fields as any);
    if (type === "json") {
      reqData[key] = JSON.parse(val as string);
    }
  }

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
