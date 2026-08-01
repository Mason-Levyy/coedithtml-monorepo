export default {
  async fetch(): Promise<Response> {
    return new Response("Coedit worker placeholder", { status: 200 });
  },
} satisfies ExportedHandler;
