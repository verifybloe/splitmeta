import { prisma } from "@/lib/prisma";
import { generateCompanionToken } from "@/lib/companionAuth";
import { generateUploadApiKey } from "@/lib/ingest";

export type CompanionCredentials = {
  companionToken: string;
  apiKey: string;
  email: string;
  name: string | null;
  plan: string;
  siteUrl: string;
};

export async function issueCompanionCredentials(
  userId: string,
  siteUrl: string,
): Promise<CompanionCredentials> {
  const companion = generateCompanionToken();
  const upload = generateUploadApiKey();

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      companionTokenHash: companion.hash,
      companionTokenPrefix: companion.prefix,
      uploadApiKeyHash: upload.hash,
      uploadApiKeyPrefix: upload.prefix,
    },
    select: {
      email: true,
      name: true,
      plan: true,
    },
  });

  return {
    companionToken: companion.raw,
    apiKey: upload.raw,
    email: user.email,
    name: user.name,
    plan: user.plan,
    siteUrl,
  };
}
