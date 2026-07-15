"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateUploadApiKey } from "@/lib/ingest";

export async function rotateUploadApiKey(): Promise<{
  ok: true;
  apiKey: string;
} | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Unauthorized" };
  }

  const key = generateUploadApiKey();
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      uploadApiKeyHash: key.hash,
      uploadApiKeyPrefix: key.prefix,
    },
  });

  revalidatePath("/account");
  return { ok: true, apiKey: key.raw };
}
