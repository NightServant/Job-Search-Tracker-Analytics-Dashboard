// supabase/functions/deno.d.ts
//
// `supabase/functions/**` is Deno source and is not part of the Next build.
// It enters the TypeScript program anyway, because src/__tests__/edgeMonitoring.test.ts
// imports _shared/edgeMonitoring.ts to test its pure helpers. Before the test
// files were typechecked at all, that import was invisible; now it surfaces
// seven `Cannot find name 'Deno'` errors.
//
// This declares only the surface edgeMonitoring.ts actually reads. It is
// deliberately not `@types/deno` -- pulling a full Deno lib into a browser
// project's program would let a src/ file reference Deno and still compile.
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}
