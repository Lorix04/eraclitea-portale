import { NextResponse } from "next/server";
import { z, type ZodSchema } from "zod";
import * as Sentry from "@sentry/nextjs";

export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: NextResponse.json(
          {
            errors: error.errors.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      error: NextResponse.json({ error: "Invalid request" }, { status: 400 }),
    };
  }
}

export function validateQuery<T>(
  request: Request,
  schema: ZodSchema<T>
): { data: T } | { error: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: NextResponse.json(
          {
            errors: error.errors.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      error: NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      ),
    };
  }
}

export function captureAPIError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
    tags: { type: "api_error" },
  });
}
