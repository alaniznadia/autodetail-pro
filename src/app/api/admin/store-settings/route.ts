import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getStoreSettings, updateStoreSettings } from "@/lib/store-settings";
import { requireAdmin } from "@/lib/api-auth";

const schema = z.object({
  freeShippingFrom: z.coerce.number().positive().nullable().optional(),
  loyaltyEnabled: z.boolean().optional(),
  loyaltyArsPerPoint: z.coerce.number().int().positive().optional(),
  loyaltyPointValue: z.coerce.number().positive().optional(),
  loyaltyMinRedeem: z.coerce.number().int().positive().optional(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const settings = await getStoreSettings();
  return NextResponse.json({
    settings: {
      freeShippingFrom: settings.freeShippingFrom?.toString() ?? null,
      loyaltyEnabled: settings.loyaltyEnabled,
      loyaltyArsPerPoint: settings.loyaltyArsPerPoint,
      loyaltyPointValue: settings.loyaltyPointValue.toString(),
      loyaltyMinRedeem: settings.loyaltyMinRedeem,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { freeShippingFrom, loyaltyPointValue, ...rest } = parsed.data;
  const settings = await updateStoreSettings({
    ...rest,
    ...(freeShippingFrom !== undefined && {
      freeShippingFrom: freeShippingFrom === null ? null : new Prisma.Decimal(freeShippingFrom),
    }),
    ...(loyaltyPointValue !== undefined && {
      loyaltyPointValue: new Prisma.Decimal(loyaltyPointValue),
    }),
  });

  return NextResponse.json({
    settings: {
      freeShippingFrom: settings.freeShippingFrom?.toString() ?? null,
      loyaltyEnabled: settings.loyaltyEnabled,
      loyaltyArsPerPoint: settings.loyaltyArsPerPoint,
      loyaltyPointValue: settings.loyaltyPointValue.toString(),
      loyaltyMinRedeem: settings.loyaltyMinRedeem,
    },
  });
}
