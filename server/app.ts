import AuthenticatingConcept from "./concepts/authenticating";
import FriendingConcept from "./concepts/friending";
import MessagingConcept from "./concepts/messaging";
import PostingConcept from "./concepts/posting";
import PreferencesConcept from "./concepts/preferences";
import ProfilingConcept from "./concepts/profiling";
import SessioningConcept from "./concepts/sessioning";
import SharingConcept from "./concepts/sharing";
import TaskingConcept from "./concepts/tasksetting";
import TrackingConcept from "./concepts/tracking";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");

// These are the concepts that I added for my app:
export const Profiling = new ProfilingConcept("profiles");
export const Preferences = new PreferencesConcept("preferences");
export const Tasking = new TaskingConcept("tasks");
export const Tracking = new TrackingConcept("goals");
export const Messaging = new MessagingConcept("messages");
export const Sharing = new SharingConcept("content");
