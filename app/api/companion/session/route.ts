import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  companionTokensEqual,
  parseCompanionAuthHeader,
} from "@/lib/companionAuth";

export const runtime = "nodejs";

async function authenticateCompanion(req: Request) {
  const raw = parseCompanionAuthHeader(req.headers.get("authorization"));
  if (!raw) return null;

  const prefix = raw.slice(0, 11);
  const candidates = await prisma.user.findMany({
    where: { companionTokenPrefix: prefix },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      image: true,
      companionTokenHash: true,
    },
  });

  for (const user of candidates) {
    if (
      user.companionTokenHash &&
      companionTokensEqual(raw, user.companionTokenHash)
    ) {
      return user;
    }
  }
  return null;
}

export async function GET(req: Request) {
  const user = await authenticateCompanion(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploads = await prisma.sessionResult.count({
    where: { userId: user.id },
  });

  return NextResponse.json({
    ok: true,
    user: {
      email: user.email,
      name: user.name,
      plan: user.plan,
      image: user.image,
    },
    uploads,
  });
}

export async function DELETE(req: Request) {
  const user = await authenticateCompanion(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      companionTokenHash: null,
      companionTokenPrefix: null,
    },
  });

  return NextResponse.json({ ok: true });
}
