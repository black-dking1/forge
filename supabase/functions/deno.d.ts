/**
 * The two Deno features our functions use, described for VS Code.
 *
 * On Supabase's servers these are built in, so this file is never
 * deployed or needed there. It only stops VS Code from underlining
 * "Deno" in red because it doesn't know what it is.
 */
declare namespace Deno {
  /** Read a secret, e.g. Deno.env.get('ANTHROPIC_API_KEY'). */
  const env: { get(name: string): string | undefined };
  /** Start the function: runs `handler` for every request it receives. */
  function serve(handler: (req: Request) => Response | Promise<Response>): unknown;
}
