declare module "archiver" {
  import type { Archiver } from "archiver";

  function archiver(
    format: string,
    options?: { zlib?: { level?: number } },
  ): Archiver;

  export default archiver;
}
