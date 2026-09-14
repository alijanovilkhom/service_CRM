import { NextRequest, NextResponse } from "next/server";
import { createLeadFromWebsite } from "@/lib/leads";

const CITY_LABELS: Record<string, string> = {
  msk: "Москва",
  spb: "Санкт-Петербург",
  ekb: "Екатеринбург",
  kzn: "Казань",
  tas: "Ташкент",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const message = typeof body.message === "string" ? body.message : "";
    const honeypot = typeof body.website === "string" ? body.website.trim() : "";
    const cityRaw = typeof body.city === "string" ? body.city.trim() : "";
    const goal = typeof body.goal === "string" ? body.goal.trim() : "";

    if (honeypot) {
      return NextResponse.json({ success: true });
    }

    if (!message.trim() && !name && !contact) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const city = CITY_LABELS[cityRaw] || cityRaw;

    await createLeadFromWebsite({ name, contact, message, city, goal });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Website feedback failed:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
