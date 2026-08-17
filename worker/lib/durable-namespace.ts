// These helpers do exactly two things with a namespace: name an instance, and
// fetch it. DurableObjectNamespace is generic in the class it fronts, so
// naming the bare type refuses the very bindings the helpers exist to accept.
// Asking for the two methods instead says what is actually needed, and lets a
// test hand over something that is not a Durable Object at all.
export type Addressable = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): { fetch(input: string): Promise<Response> };
};
