export type Addressable = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): { fetch(input: string): Promise<Response> };
};
