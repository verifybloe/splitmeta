import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateCompanionRequest } from "@/lib/companionAuth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await authenticateCompanionRequest(req);
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
  const user = await authenticateCompanionRequest(req);
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
