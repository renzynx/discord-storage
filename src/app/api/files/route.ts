import { db, files } from "@/db";
import { withAuth } from "@/lib/auth";
import { like, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const handler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const search = searchParams.get("search") || "";

  // Build where clause
  const whereClause = search ? like(files.name, `%${search}%`) : undefined;

  // Get paginated data
  const data = await db.query.files.findMany({
    ...(whereClause ? { where: whereClause } : {}),
    orderBy: (files, { desc }) => [desc(files.id)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  // Get total count using drizzle-orm's count
  let total = 0;
  if (whereClause) {
    total = Number(
      (
        await db
          .select({ count: sql`count(*)` })
          .from(files)
          .where(whereClause)
      )[0]?.count ?? 0
    );
  } else {
    total = Number(
      (await db.select({ count: sql`count(*)` }).from(files))[0]?.count ?? 0
    );
  }

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
  });
};

export const GET = withAuth(handler);
